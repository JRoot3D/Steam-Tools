// ==UserScript==
// @name         TF2 Steam Trade Helper
// @namespace    steam
// @match        *://steamcommunity.com/tradeoffer/new/*
// @version      1.1
// @author       JRoot3D
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getResourceText
// @require      https://cdn.jsdelivr.net/alertifyjs/1.8.0/alertify.min.js
// @resource     alertifyCSS https://cdn.jsdelivr.net/alertifyjs/1.8.0/css/alertify.min.css
// @resource     alertifyDefaultCSS https://cdn.jsdelivr.net/alertifyjs/1.8.0/css/themes/default.min.css
// @downloadURL  https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_Steam_Trade_Helper.user.js
// @updateURL    https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_Steam_Trade_Helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    var APP_ID = 440;
    var CONTEXT_ID = 2;
    var ME = 'me';
    var THEM = 'them';

    var ITEM_KEY = 'Mann Co. Supply Crate Key';
    var ITEM_REFINED_METAL = 'Refined Metal';
    var ITEM_RECLAIMED_METAL = 'Reclaimed Metal';
    var ITEM_SCRAP_METAL = 'Scrap Metal';

    var _params = {};

    var _data = {
        me: {
            data: null,
            selector: '.tutorial_arrow_ctn',
            controls: null,
            keys: [],
            metal: {
                total: 0,
                refined: [],
                reclaimed: [],
                scrap: []
            },
            loaded: false,
            addMetal: function () {
                addMetal(ME);
            },
            addKeys: function () {
                addKeys(ME);
            },
            clearTrade: function () {
                clearTrade(ME);
            },
            task: function () {
                var itemName = _params['sell_item'];
                if (itemName) {
                    var items = getItemsByName(_data.me.data, itemName);
                    if (items.length > 0) {
                        selectItems(items, 1, ME);
                    } else {
                        alertify.error('The selected item does not exist in the Your Inventory.');
                    }
                }

                var buyPrice = _params['buy_price'];
                if (buyPrice) {
                    parseParamPrice(buyPrice, ME);
                }

                checkBothLoaded(THEM);
            }
        },
        them: {
            data: null,
            selector: '.tradeoffer_partner_ready_note',
            controls: null,
            keys: [],
            metal: {
                total: 0,
                refined: [],
                reclaimed: [],
                scrap: []
            },
            loaded: false,
            addMetal: function () {
                addMetal(THEM);
            },
            addKeys: function () {
                addKeys(THEM);
            },
            clearTrade: function () {
                clearTrade(THEM);
            },
            task: function () {
                var itemParam = _params['for_item'];

                if (itemParam) {
                    var item = itemParam.split('_');
                    if (checkItemByAssetId(_data.them.data, item[2])) {
                        g_rgCurrentTradeStatus.them.assets[0] = {
                            appid: item[0],
                            contextid: item[1],
                            assetid: item[2],
                            amount: 1
                        };
                        refreshTrade();
                    } else {
                        alertify.error('The selected item does not exist in the Their Inventory.');
                    }
                }

                var sellPrice = _params['sell_price'];
                if (sellPrice) {
                    parseParamPrice(sellPrice, THEM);
                }

                checkBothLoaded(ME);
            }
        }
    };

    var addStyle = function (name) {
        var style = GM_getResourceText(name);
        GM_addStyle(style);
    };

    var refreshTrade = function () {
        RefreshTradeStatus(g_rgCurrentTradeStatus, true);
    };

    var requestInventory = function (steamId, tag) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://steamcommunity.com/profiles/' + steamId + '/inventory/json/' + APP_ID + '/' + CONTEXT_ID,
            onload: function (response) {
                var data = JSON.parse(response.responseText);
                initTradeData(data, tag);
            }
        });
    };

    var getItemsByName = function (data, name) {
        var foundItems = [];
        var itemid;
        var ids = data['rgInventory'];
        var items = data['rgDescriptions'];

        for (var key in ids) {
            var obj = ids[key];
            var invid = obj['classid'] + '_' + obj['instanceid'];
            var marketname = items[invid]['market_hash_name'];

            if (items[invid]['tradable'] == 1 && (marketname == name || marketname == 'The ' + name)) {
                var item = {
                    appid: APP_ID,
                    contextid: CONTEXT_ID,
                    assetid: key,
                    amount: 1
                };
                foundItems.push(item);
            }
        }

        return foundItems;
    };

    var checkItemByAssetId = function (data, id) {
        return !!data['rgInventory'][id];
    };

    var initTradeData = function (data, tag) {
        var keys = getItemsByName(data, ITEM_KEY);

        var refinedMetal = getItemsByName(data, ITEM_REFINED_METAL);
        var reclaimedMetal = getItemsByName(data, ITEM_RECLAIMED_METAL);
        var scrapMetal = getItemsByName(data, ITEM_SCRAP_METAL);

        var totalRefinedMetalCount = refinedMetal.length;
        var totalReclaimedMetalCount = reclaimedMetal.length;
        var totalScrapMetalCount = scrapMetal.length;

        totalScrapMetalCount += totalRefinedMetalCount * 9 + totalReclaimedMetalCount * 3;
        totalRefinedMetalCount = scrapToRefined(totalScrapMetalCount);

        _data[tag].data = data;
        _data[tag].loaded = true;
        _data[tag].keys = keys;
        _data[tag].metal.refined = refinedMetal;
        _data[tag].metal.reclaimed = reclaimedMetal;
        _data[tag].metal.scrap = scrapMetal;
        _data[tag].metal.total = totalRefinedMetalCount;

        initInterface(tag);
        _data[tag].task();
    };

    var scrapToRefined = function (value) {
        var result = Math.floor(value / 9);
        var scrap = value - result * 9;
        result = 1 * (result + '.' + (scrap * 11));

        return result;
    };

    var initInterface = function (tag) {
        var element = jQuery(_data[tag].selector).first();

        var buttons = document.createElement('DIV');
        buttons.className = 'newmodal_buttons';

        buttons.appendChild(createButton('Clear', 'btn_grey_white_innerfade btn_medium', _data[tag].clearTrade));

        buttons.appendChild(createButton('Add Metal', 'btn_green_white_innerfade btn_medium', _data[tag].addMetal));
        buttons.appendChild(createButton('Add Keys', 'btn_blue_white_innerfade btn_medium', _data[tag].addKeys));

        _data[tag].controls = buttons;

        element.append(buttons);
    };

    var checkBothLoaded = function (tag) {
        if (_data[tag].loaded) {
            jQuery(_data[THEM].controls).append(createButton('Buy price', 'btn_green_white_innerfade btn_medium', enterBuyPrice));
            jQuery(_data[ME].controls).append(createButton('Sell price', 'btn_green_white_innerfade btn_medium', enterSellPrice));
        }
    };

    var enterBuyPrice = function () {
        ShowPromptDialog('Enter price', 'Example 1k 3.44r or 3k or 2.33r').done(function (value) {
            if (value !== null) {
                parseEnteredPrice(value, ME);
            }
        });
    };

    var enterSellPrice = function () {
        ShowPromptDialog('Enter price', 'Example 1k 3.44r or 3k or 2.33r').done(function (value) {
            if (value !== null) {
                parseEnteredPrice(value, THEM);
            }
        });
    };

    var addKeys = function (tag) {
        ShowPromptDialog('Add Keys').done(function (value) {
            if (value !== null) {
                selectKeys(value, tag);
            }
        });
    };

    var addMetal = function (tag) {
        ShowPromptDialog('Add Metal').done(function (value) {
            if (value !== null) {
                selectMetal(value, tag);
            }
        });
    };

    var clearTrade = function (tag) {
        g_rgCurrentTradeStatus[tag].assets = [];
        refreshTrade();
    };

    var selectItems = function (items, count, tag) {
        var availableItems = items.length;
        if (count <= availableItems) {
            for (var i = 0; i < count; i++) {
                if (g_rgCurrentTradeStatus[tag].assets.indexOf(items[i]) == -1) {
                    g_rgCurrentTradeStatus[tag].assets.push(items[i]);
                }
            }
        }

        refreshTrade();
    };

    var selectKeys = function (count, tag) {
        count = Math.floor(count);
        var availableKeys = _data[tag].keys.length;
        if (count <= availableKeys) {
            selectItems(_data[tag].keys, count, tag);
        } else {
            notify(availableKeys, tag, ITEM_KEY, selectKeys);
        }
    };

    var selectMetal = function (count, tag) {
        var availableMetal = _data[tag].metal.total;
        if (count <= availableMetal) {
            count = count * 1 + 0.001;

            var metal = _data[tag].metal;

            var totalRefinedMetalCount = metal.refined.length;
            var totalReclaimedMetalCount = metal.reclaimed.length;
            var totalScrapMetalCount = metal.scrap.length;

            var refinedMetal = Math.floor(count);
            var reclaimedMetal = 0;
            var scrapMetal = 0;

            count = Math.floor((count - refinedMetal) * 100);
            if (count > 0) {
                scrapMetal = Math.ceil(count / 11);
                reclaimedMetal = Math.floor(count / 33);
                scrapMetal = scrapMetal - reclaimedMetal * 3;
            }

            if (refinedMetal > totalRefinedMetalCount) {
                reclaimedMetal += (refinedMetal - totalRefinedMetalCount) * 3;
                refinedMetal = totalRefinedMetalCount;
            }

            if (reclaimedMetal > totalReclaimedMetalCount) {
                scrapMetal += (reclaimedMetal - totalReclaimedMetalCount) * 3;
                reclaimedMetal = totalReclaimedMetalCount;
            }

            if (scrapMetal > totalScrapMetalCount) {
                alertify.error('Can\'t combine selected value. Need ' + scrapToRefined(scrapMetal) + ' ' + ITEM_REFINED_METAL);
            }

            if (refinedMetal > 0) {
                selectItems(metal.refined, refinedMetal, tag);
            }

            if (reclaimedMetal > 0) {
                selectItems(metal.reclaimed, reclaimedMetal, tag);
            }

            if (scrapMetal > 0) {
                selectItems(metal.scrap, scrapMetal, tag);
            }
        } else {
            notify(availableMetal, tag, ITEM_REFINED_METAL, selectMetal);
        }
    };

    var parseParamPrice = function (price, tag) {
        var priceData = price.split('_');

        if (priceData.length == 2) {
            var keys = priceData[0];
            var metal = priceData[1];

            if (keys > 0) {
                selectKeys(keys, tag);
            }

            if (metal > 0) {
                selectMetal(metal, tag);
            }
        } else {
            alertify.error('Wrong price format! Price format keys_metal (example 1_3.33 or 0_1.22)');
        }
    };

    var parseEnteredPrice = function (price, tag) {
        var keyRegExp = /\d+(\.\d+)?k/g;
        var metalRegExp = /\d+(\.\d+)?r/g;
        var valueRegExp = /\d+(\.\d+)?/g;

        var keys = price.match(keyRegExp);
        var metal = price.match(metalRegExp);

        if (Array.isArray(keys)) {
            keys = keys[0].match(valueRegExp);
        } else if (typeof keys === 'string' || keys instanceof String) {
            keys = keys.match(valueRegExp);
        } else {
            keys = 0;
        }

        if (Array.isArray(metal)) {
            metal = metal[0].match(valueRegExp);
        } else if (typeof metal === 'string' || metal instanceof String) {
            metal = metal.match(valueRegExp);
        } else {
            metal = 0
        }

        if (keys > 0) {
            selectKeys(keys, tag);
        }

        if (metal > 0) {
            selectMetal(metal, tag);
        }
    };

    var notify = function (available, tag, itemName, callback) {
        if (available > 0) {
            alertify.warning('Available only ' + available + ' ' + itemName + '. Click to ' + (tag == ME ? 'give' : 'take') + ' All').delay(10).callback = function (isClicked) {
                if (isClicked) {
                    callback(available, tag);
                }
            };
        } else {
            alertify.error((tag == ME ? 'You do not have ' : 'He had no ') + itemName);
        }
    };

    var parseURLParams = function () {
        var result = {};
        if (document.location.href.indexOf('?') !== -1) {
            var query = document.location.href
                .replace(/^.*?\?/, '')
                .replace(/#.*$/, '')
                .split('&');
            for (var i = 0, l = query.length; i < l; i++) {
                var aux = decodeURIComponent(query[i]).split('=');
                result[aux[0]] = aux[1];
            }
        }
        return result;
    };

    var createButton = function (text, className, onclick) {
        var button = document.createElement('DIV');
        button.className = className;
        var caption = document.createElement('SPAN');
        caption.innerHTML = text;
        button.appendChild(caption);
        jQuery(button).on('click', onclick);

        return button;
    };

    var mainInit = function () {
        addStyle('alertifyCSS');
        addStyle('alertifyDefaultCSS');

        _params = parseURLParams();
        requestInventory(g_steamID, ME);
        requestInventory(g_ulTradePartnerSteamID, THEM);
    };

    mainInit();
})();
