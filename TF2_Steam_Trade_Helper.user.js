// ==UserScript==
// @name         TF2 Steam Trade Helper
// @namespace    steam
// @match        *://steamcommunity.com/tradeoffer/new/*
// @version      1.4
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

    var PARAMS = {
        BUY_PRICE: 'buy_price',
        SELL_PRICE: 'sell_price',
        SELL_ITEM: 'sell_item',
        FOR_ITEM: 'for_item'
    };

    var ITEM_KEY = 'Mann Co. Supply Crate Key';
    var ITEM_REFINED_METAL = 'Refined Metal';
    var ITEM_RECLAIMED_METAL = 'Reclaimed Metal';
    var ITEM_SCRAP_METAL = 'Scrap Metal';

    var _params = {};

    var _data = {
        me: {
            data: null,
            selector: '.tutorial_arrow_ctn',
            keys: [],
            previousKeys: 0,
            metal: {
                total: 0,
                previousRefined: 0,
                previousReclaimed: 0,
                previousScrap: 0,
                refined: [],
                reclaimed: [],
                scrap: []
            },
            loaded: false,
            clearTrade: function () {
                clearTrade(ME);
            },
            task: function () {
                var itemName = _params[PARAMS.SELL_ITEM];
                if (itemName) {
                    var items = getItemsByName(_data.me.data, itemName);
                    if (items.length > 0) {
                        selectItems(items, 1, 0, ME);
                        refreshTrade();
                    } else {
                        alertify.error('The selected item does not exist in the Your Inventory.');
                    }
                }

                var buyPrice = _params[PARAMS.BUY_PRICE];
                if (buyPrice) {
                    parseParamPrice(buyPrice, ME);
                }
            }
        },
        them: {
            data: null,
            selector: '.tradeoffer_partner_ready_note',
            keys: [],
            previousKeys: 0,
            metal: {
                total: 0,
                previousRefined: 0,
                previousReclaimed: 0,
                previousScrap: 0,
                refined: [],
                reclaimed: [],
                scrap: []
            },
            loaded: false,
            clearTrade: function () {
                clearTrade(THEM);
            },
            task: function () {
                var itemParam = _params[PARAMS.FOR_ITEM];

                if (itemParam) {
                    var item = itemParam.split('_');
                    if (checkItemByAssetId(_data.them.data, item[2])) {
                        g_rgCurrentTradeStatus.them.assets.push({
                            appid: item[0],
                            contextid: item[1],
                            assetid: item[2],
                            amount: 1
                        });
                        refreshTrade();
                    } else {
                        alertify.error('The selected item does not exist in the Their Inventory.');
                    }
                }

                var sellPrice = _params[PARAMS.SELL_PRICE];
                if (sellPrice) {
                    parseParamPrice(sellPrice, THEM);
                }
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
        _data[tag].keys = keys;
        _data[tag].metal.refined = refinedMetal;
        _data[tag].metal.reclaimed = reclaimedMetal;
        _data[tag].metal.scrap = scrapMetal;
        _data[tag].metal.total = totalRefinedMetalCount;
        _data[tag].loaded = true;

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
        var element;

        var buttons = document.createElement('DIV');
        buttons.className = 'newmodal_buttons';

        if (tag == ME) {
            element = jQuery(_data[THEM].selector).first();
            buttons.appendChild(createButton('Buy by:', 'btn_blue_white_innerfade btn_medium', enterBuyPrice, 't'));
            buttons.appendChild(createInput(PARAMS.BUY_PRICE));
            buttons.appendChild(createButton('Clear', 'btn_grey_white_innerfade btn_medium', _data[THEM].clearTrade, 'v'));

        } else {
            element = jQuery(_data[ME].selector).first();
            buttons.appendChild(createButton('Sell by:', 'btn_blue_white_innerfade btn_medium', enterSellPrice, 'r'));
            buttons.appendChild(createInput(PARAMS.SELL_PRICE));
            buttons.appendChild(createButton('Clear', 'btn_grey_white_innerfade btn_medium', _data[ME].clearTrade, 'c'));
        }

        element.append(buttons);
    };

    var enterBuyPrice = function () {
        var value = jQuery('#' + PARAMS.BUY_PRICE).val();
        if (value !== null) {
            parseEnteredPrice(value, ME);
        }
    };

    var enterSellPrice = function () {
        var value = jQuery('#' + PARAMS.SELL_PRICE).val();
        if (value !== null) {
            parseEnteredPrice(value, THEM);
        }
    };

    var clearTrade = function (tag) {
        g_rgCurrentTradeStatus[tag].assets.length = 0;

        if (tag == ME) {
            jQuery('#' + PARAMS.BUY_PRICE).val('');
        } else {
            jQuery('#' + PARAMS.SELL_PRICE).val('');
        }

        refreshTrade();
    };

    var selectItems = function (items, count, previousCount, tag) {
        var availableItems = items.length;
        if (count <= availableItems) {
            var assets = g_rgCurrentTradeStatus[tag].assets;
            for (var i = 0; i < count; i++) {
                if (assets.indexOf(items[i]) == -1) {
                    assets.push(items[i]);
                }
            }

            if (previousCount > count) {
                for (i = count; i < previousCount; i++) {
                    var index = assets.indexOf(items[i]);
                    if (index != -1) {
                        assets.splice(index, 1);
                    }
                }
            }
        }
    };

    var selectKeys = function (count, tag) {
        count = Math.floor(count);
        var availableKeys = _data[tag].keys.length;
        if (count <= availableKeys) {
            selectItems(_data[tag].keys, count, _data[tag].previousKeys, tag);
            _data[tag].previousKeys = count;
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

            selectItems(metal.refined, refinedMetal, _data[tag].metal.previousRefined, tag);
            _data[tag].metal.previousRefined = refinedMetal;

            selectItems(metal.reclaimed, reclaimedMetal, _data[tag].metal.previousReclaimed, tag);
            _data[tag].metal.previousReclaimed = reclaimedMetal;

            selectItems(metal.scrap, scrapMetal, _data[tag].metal.previousScrap, tag);
            _data[tag].metal.previousScrap = scrapMetal;

        } else {
            notify(availableMetal, tag, ITEM_REFINED_METAL, selectMetal);
        }
    };

    var parseParamPrice = function (price, tag) {
        var priceData = price.split('_');

        if (priceData.length == 2) {
            var value = '';
            var keys = priceData[0];
            var metal = priceData[1];

            selectKeys(keys, tag);
            if (keys > 0) {
                value += keys + 'k '
            }

            selectMetal(metal, tag);
            if (metal > 0) {
                value += metal + 'r ';
            }

            refreshTrade();

            if (value) {
                if (tag == ME) {
                    jQuery('#' + PARAMS.BUY_PRICE).val(value);
                } else {
                    jQuery('#' + PARAMS.SELL_PRICE).val(value);
                }
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
            metal = 0;
        }

        selectKeys(keys, tag);
        selectMetal(metal, tag);

        refreshTrade();

        if (keys == 0 && metal == 0) {
            alertify.error('Wrong price format! Price format example 1k 3.33r or 1.22r or 5k)');
        }
    };

    var notify = function (available, tag, itemName, callback) {
        if (available > 0) {
            alertify.warning('Available only ' + available + ' ' + itemName + '. Click to ' + (tag == ME ? 'give' : 'take') + ' All').delay(10).callback = function (isClicked) {
                if (isClicked) {
                    callback(available, tag);
                    refreshTrade();
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

    var createButton = function (text, className, onclick, accessKey) {
        var button = document.createElement('DIV');
        button.className = className;
        button.setAttribute('accessKey', accessKey);
        var caption = document.createElement('SPAN');
        caption.innerHTML = text;
        button.appendChild(caption);
        jQuery(button).on('click', onclick);

        return button;
    };

    var createInput = function (id) {
        var field = document.createElement('INPUT');
        field.setAttribute('placeholder', 'Enter price...');
        field.setAttribute('type', 'text');
        field.className = 'filter_search_box';
        field.id = id;
        return field;
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
