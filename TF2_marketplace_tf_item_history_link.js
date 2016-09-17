// ==UserScript==
// @name marketplace.tf helper
// @namespace http://tampermonkey.net/
// @version 0.1
// @description try to take over the world!
// @author JRoot3D
// @match *://marketplace.tf/items/*
// @grant none
// @downloadURL  https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_marketplace_tf_item_history_link.js
// @updateURL    https://github.com/JRoot3D/Steam-Tools/raw/master/TF2_marketplace_tf_item_history_link.js
// ==/UserScript==

(function() {
    'use strict';

    var regex = new RegExp('\\d{8,}'); // expression here

    jQuery('td').filter(function () {
        var element = $(this);
        var text = element.text();
        if (regex.test(text)) {
            var link = document.createElement('A');
            var linkText = document.createTextNode(text);
            link.setAttribute('href', 'http://backpack.tf/item/' + text);
            link.setAttribute('target', '_blank');
            link.appendChild(linkText);
            element.text('');
            element.append(link);
        }
    });
})();