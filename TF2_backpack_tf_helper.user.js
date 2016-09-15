// ==UserScript==
// @name         backpack.tf Trade Helper
// @namespace    backpack
// @version      0.3
// @author       JRoot3D
// @match        *://backpack.tf/classifieds*
// @match        *://backpack.tf/stats*
// @grant        none
// @downloadURL  https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_backpack_tf_helper.user.js
// @updateURL    https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_backpack_tf_helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    var isNeedQualityName = function (id) {
        var result = false;

        switch (id) {
            case '1':
            case '3':
            case '5':
            case '9':
            case '11':
            case '13':
            case '14':
                result = true;
                break;
        }

        return result;
    };

    var parsePrice = function (price) {
        price = price.replace(/\s/g, '');
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

        return keys + '_' + metal;
    };

    var updateTradeLinks = function () {
        jQuery('.media.listing').each(function () {
            var item = jQuery(this).find('.item');
            var price = item.attr('data-listing_price');
            var priceParam = parsePrice(price);

            var intent = item.attr('data-listing_intent');
            var button = jQuery(this).find('.btn.btn-bottom.btn-xs.btn-primary, .btn.btn-bottom.btn-xs.btn-success');
            var href = button.attr('href');

            if (href.indexOf('friends') == -1) {
                if (intent == '0') {
                    var itemAustralium = item.attr('data-australium');
                    var itemQuality = item.attr('data-quality');
                    var itemQName = item.attr('data-q_name');
                    var itemName = (isNeedQualityName(itemQuality) ? itemQName + ' ' : '') +
                        (itemAustralium ? 'Australium ' : '') +
                        item.attr('data-name');
                    href += '&sell_item=' + itemName;
                    href += '&sell_price=' + priceParam;
                } else {
                    href += '&buy_price=' + priceParam;
                }

                button.attr('href', href);
            }
        });
    };

    updateTradeLinks();
})();