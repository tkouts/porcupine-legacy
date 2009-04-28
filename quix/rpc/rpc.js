//==============================================================================
//  Copyright 2005-2009 Tassos Koutsovassilis and contributors
//
//  This file is part of Porcupine.
//  Porcupine is free software; you can redistribute it and/or modify
//  it under the terms of the GNU Lesser General Public License as published by
//  the Free Software Foundation; either version 2.1 of the License, or
//  (at your option) any later version.
//  Porcupine is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Lesser General Public License for more details.
//  You should have received a copy of the GNU Lesser General Public License
//  along with Porcupine; if not, write to the Free Software
//  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
//==============================================================================

QuiX.rpc = {};

QuiX.rpc.handleError = function(req, e) {
	QuiX.removeLoader();
	document.desktop.parseFromString(
		'<dialog xmlns="http://www.innoscript.org/quix" title="RPC Error" \
                resizable="true" close="true" width="560" height="240" \
                left="center" top="center"> \
            <wbody> \
                <box spacing="8" width="100%" height="100%"> \
                    <icon width="56" height="56" padding="12,12,12,12" \
                        img="$THEME_URL$images/error32.gif"/> \
                    <rect padding="4,4,4,4" overflow="auto"><xhtml><![CDATA[ \
                        <pre style="color:red;font-size:12px; \
                            font-family:monospace;padding-left:4px">' +
                            e.name + '\n\n' + e.message +
                        '</pre>]]></xhtml> \
                    </rect> \
                </box> \
            </wbody> \
            <dlgbutton onclick="__closeDialog__" width="70" height="22" \
                caption="Close"/> \
        </dialog>');
	if (req.onerror) req.onerror(req, e);
}

QuiX.rpc._cache = (function() {
    if (QuiX.persist.type) {
        var cache = new QuiX.persist.Store('rpccache');
        return {
            get : function(key, callback) {
                cache.get(key,
                    function(ok, value){
                        if (value) {
                            value = unescape(value);
                            var _pos = value.indexOf('_')
                            callback([value.substring(0, _pos),
                                      value.substring(_pos + 1)]);
                        }
                        else
                            callback(null);
                    });
            },
            set : function(key, etag, response) {
                var value = escape(etag + '_' + response);
                if (QuiX.persist.size < 0 || QuiX.persist.size > value.length)
                    cache.set(key, value);
            }
        }
    }
    else
        return null;
})();
