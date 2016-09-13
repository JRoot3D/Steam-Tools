// ==UserScript==
// @name        TF2 Steam Trade Helper
// @namespace   steam
// @match       *://steamcommunity.com/tradeoffer/new/*
// @version     0.5
// @grant       GM_xmlhttpRequest
// @downloadURL https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_Steam_Trade_Helper.user.js
// @updateURL   https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_Steam_Trade_Helper.user.js
// ==/UserScript==

(function() {
    'use strict';

    var APP_ID = 440;
    var CONTEXT_ID = 2;
    var ME = 'me';
    var THEM = 'them';

    var ITEM_KEY = 'Mann Co. Supply Crate Key';
    var ITEM_REFINED_METAL = 'Refined Metal';
    var ITEM_RECLAIMED_METAL = 'Reclaimed Metal';
    var ITEM_SCRAP_METAL = 'Scrap Metal';

    var _data = {
        me: {
            selector: '.tutorial_arrow_ctn',
            keys: [],
            metal: {
                total: 0,
                refined: [],
                reclaimed: [],
                scrap: []
            },
            addMetal: function() {
                addMetal(ME);
            },
            addKeys: function() {
                addKeys(ME);
            },
            clearTrade: function() {
                clearTrade(ME);
            }
        },
        them: {
            selector: '.tradeoffer_partner_ready_note',
            keys: [],
            metal: {
                total: 0,
                refined: [],
                reclaimed: [],
                scrap: []
            },
            addMetal: function() {
                addMetal(THEM);
            },
            addKeys: function() {
                addKeys(THEM);
            },
            clearTrade: function() {
                clearTrade(THEM);
            }
        }
    };

    var refreshTrade = function() {
        RefreshTradeStatus(g_rgCurrentTradeStatus, true);
    };

    var requestInventory = function(steamId, tag) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://steamcommunity.com/profiles/' + steamId + '/inventory/json/' + APP_ID + '/' + CONTEXT_ID,
            onload: function(response) {
                var data = JSON.parse(response.responseText);
                initTradeData(data, tag);
            }
        });
    };

    var getItems = function(data, name) {
        var foundItems = [];
        var itemid;
        var ids = data.rgInventory;
        var items = data.rgDescriptions;

        for (var key in ids) {
            var obj = ids[key];
            var invid = obj.classid + '_' + obj.instanceid;
            var marketname = items[invid].market_hash_name;

            if (items[invid].tradable == 1 && (marketname == name || marketname == 'The ' + name)) {
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

    var initTradeData = function(data, tag) {
        var keys = getItems(data, ITEM_KEY);

        var refinedMetal = getItems(data, ITEM_REFINED_METAL);
        var reclaimedMetal = getItems(data, ITEM_RECLAIMED_METAL);
        var scrapMetal = getItems(data, ITEM_SCRAP_METAL);

        var totalRefinedMetalCount = refinedMetal.length;
        var totalReclaimedMetalCount = reclaimedMetal.length;
        var totalScrapMetalCount = scrapMetal.length;

        totalScrapMetalCount += totalReclaimedMetalCount * 3;
        totalRefinedMetalCount += scrapToRefined(totalScrapMetalCount);

        _data[tag].keys = keys;
        _data[tag].metal.refined = refinedMetal;
        _data[tag].metal.reclaimed = reclaimedMetal;
        _data[tag].metal.scrap = scrapMetal;
        _data[tag].metal.total = totalRefinedMetalCount;

        initInterface(tag);
    };

    var scrapToRefined = function(value) {
        var result = Math.floor(value / 9);
        var scrap = value - result * 9;
        var reclaimed = Math.floor(scrap / 3);

        scrap -= reclaimed * 3;
        result += reclaimed * 0.33 + scrap * 0.11;

        return result;
    };

    var initInterface = function(tag) {
        var element = jQuery(_data[tag].selector).first();

        var buttons = document.createElement('DIV');
        buttons.className = 'newmodal_buttons';

        buttons.appendChild(createButton('Add Metal', 'btn_green_white_innerfade btn_medium', _data[tag].addMetal));
        buttons.appendChild(createButton('Add Keys', 'btn_green_white_innerfade btn_medium', _data[tag].addKeys));
        buttons.appendChild(createButton('Clear', 'btn_grey_white_innerfade btn_medium', _data[tag].clearTrade));

        element.append(buttons);
    };

    var addKeys = function(tag) {
        ShowPromptDialog('Add Keys').done(function(value) {
            if (value !== null) {
                selectKeys(value, tag);
                refreshTrade();
            }
        });
    };

    var addMetal = function(tag) {
        ShowPromptDialog('Add Metal').done(function(value) {
            if (value !== null) {
                selectMetal(value, tag);
                refreshTrade();
            }
        });
    };

    var clearTrade = function(tag) {
        g_rgCurrentTradeStatus[tag].assets = [];
        refreshTrade();
    };

    var selectItems = function(items, count, tag) {
        var availableItems = items.length;
        if (count <= availableItems) {
            for (var i = 0; i < count; i++) {
                g_rgCurrentTradeStatus[tag].assets.push(items[i]);
            }
        }
    };

    var selectKeys = function(count, tag) {
        var availableKeys = _data[tag].keys.length;
        if (count <= availableKeys) {
            selectItems(_data[tag].keys, count, tag);
        } else {
            ShowAlertDialog(ITEM_KEY, 'Found only ' + availableKeys);
        }
    };

    var selectMetal = function(count, tag) {
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
                ShowAlertDialog(ITEM_REFINED_METAL, 'Can\'t combine selected value. Need ' + scrapToRefined(scrapMetal));
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
            ShowAlertDialog(ITEM_REFINED_METAL, 'Found only ' + availableMetal);
        }
    };

    var createButton = function(text, className, onclick) {
        var button = document.createElement('DIV');
        button.className = className;
        var caption = document.createElement('SPAN');
        caption.innerHTML = text;
        button.appendChild(caption);
        jQuery(button).on('click', onclick);

        return button;
    };

    var getParameterByName = function(name) {
        var regex = new RegExp("[\\?&]" + name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]") + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    if (getParameterByName('for_item')) {
        var item = getParameterByName('for_item').split("_");
        g_rgCurrentTradeStatus.them.assets[0] = {
            appid: item[0],
            contextid: item[1],
            assetid: item[2],
            amount: 1
        };
    }

    requestInventory(g_steamID, ME);
    requestInventory(g_ulTradePartnerSteamID, THEM);
})();
