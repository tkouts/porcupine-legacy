/************************
File Control
************************/
QuiX.ui.File = function(/*params*/) {
	var params = arguments[0] || {};

    params.onunload = QuiX.ui.File.onunload;
	params.height = params.height || 24;
	this.name = params.name;
	this.href = params.href;
	this.readonly = (params.readonly == 'true' ||
					 params.readonly == true)? true:false;

    if (params.filename) {
        this.file = {
            name : params.filename,
            size : params.size
        }
    }

	this.base = QuiX.ui.Box;
	this.base(params);

    var f = new QuiX.ui.Link({
            caption : this._getCaption(),
            href : this.href || 'javascript:void(0)',
            target : '',
            bgcolor : 'white',
            border : 1
        });
    this.appendChild(f);
    f.div.className = 'field';

	params.multiple = false;
    params.btnlpadding = params.btnlpadding || 3;
    params.btntpadding = params.btntpadding || params.height - 22;

	var self = this;
    this.attachEvent('onload', function() {
        var btn;
        if (params.placeholder) {
            btn = document.desktop.getWidgetById(params.placeholder);
        }
        else {
            params.caption = '...';
            params.img = null;
            btn = new QuiX.ui.Widget({
                width : 24,
                border : 1
            });
            btn.div.className = 'btnupload';
            self.appendChild(btn);
        }
        btn.div.innerHTML = '<span id="' + btn._uniqueid + '"></span>';
        self.uploader = QuiX.ui.File._getUploader(
            self, btn._uniqueid, params);
    });
}

QuiX.constructors['file'] = QuiX.ui.File;
QuiX.ui.File.prototype = new QuiX.ui.Box;
QuiX.ui.File.prototype.customEvents =
    QuiX.ui.Box.prototype.customEvents.concat(['oncomplete']);
// backwards compatibility
var File = QuiX.ui.File;

QuiX.ui.File.onunload = function(obj) {
    obj.uploader.destroy();
}

QuiX.ui.File._getUploader = function(obj, placeholder_id, params) {
    var action = params.multiple? SWFUpload.BUTTON_ACTION.SELECT_FILES:
                                  SWFUpload.BUTTON_ACTION.SELECT_FILE;

    var uploader = new SWFUpload({
        upload_url : QuiX.root + '?cmd=http_upload',
        flash_url : QuiX.baseUrl + 'swfupload/swfupload.swf',
        post_params : {_state : document.cookie},
        use_query_string : false,
        debug: false,

        button_placeholder_id : placeholder_id,
        button_text : params.caption,
        button_text_left_padding : params.btnlpadding,
        button_text_top_padding : params.btntpadding,
        button_width : '100%',
        button_height : '100%',
        button_window_mode : 'transparent',
        button_action : action,
        button_image_url: params.img || QuiX.getThemeUrl() + 'images/transp.gif',
        button_disabled : (params.readonly == 'true' ||
                           params.readonly == true)? true:false,
        
        file_size_limit : params.maxfilesize || 0,
        file_types : params.filetypes || '*',

        //events
        upload_error_handler : function() {
            obj.uploadError.apply(obj, arguments);
        },
        file_queue_error_handler : function() {
            obj.queueError.apply(obj, arguments);
        },
        file_dialog_complete_handler : function(){
            obj.beginupload.apply(obj, arguments);
        },
        file_queued_handler : function() {
            obj.fileSelected.apply(obj, arguments);
        },
        upload_progress_handler : function() {
            obj.updateProgress.apply(obj, arguments);
        },
        upload_success_handler : function() {
            obj.uploadSuccess.apply(obj, arguments);
        },
        upload_complete_handler : function() {
            obj.uploadComplete.apply(obj, arguments);
        }
    });
    return uploader;
}

QuiX.ui.File.prototype.openDocument = function() {
	window.location.href = this.href;
}

QuiX.ui.File.prototype.fileSelected = function(file) {
    this.file = file;
}

QuiX.ui.File.prototype.beginupload = function(nfiles, queued, tqueued) {
    if (queued > 0) {
        var self = this;
        document.desktop.parseFromString(
            '<dialog xmlns="http://www.innoscript.org/quix" title="' +
                    this.file.name + '" ' +
                    'width="240" height="90" left="center" top="center">' +
                '<wbody>' +
                    '<progressbar width="90%" height="20" left="center" top="center" ' +
                            'maxvalue="' + this.file.size + '">' +
                        '<label align="center" width="100%" height="100%" caption="0%"/>' +
                    '</progressbar>' +
                '</wbody>' +
                '<dlgbutton width="70" height="22" caption="' +
                    document.desktop.attributes.CANCEL + '"/>' +
            '</dialog>',
            function(dlg) {
                self.attributes.pbar =
                    dlg.getWidgetsByType(ProgressBar)[0];
                dlg.buttons[0].attachEvent('onclick',
                    function (evt, w) {
                        self.uploader.cancelUpload(null, false);
                        dlg.close();
                    }
                );
                self.uploader.startUpload();
            }
        );
    }
}

QuiX.ui.File.prototype.updateProgress = function(file, bytes_complete, total_bytes) {
	var pbar = this.attributes.pbar;
	pbar.setValue(bytes_complete);
	pbar.widgets[1].setCaption(
        parseInt((bytes_complete / pbar.maxvalue) * 100) + '%');
}

QuiX.ui.File.prototype.uploadSuccess = function(file, server_data, response) {
    this.file.tmp_file = server_data;
}

QuiX.ui.File.prototype.uploadComplete = function(file) {
    this.widgets[0].setCaption(file.name);
	this.attributes.pbar.getParentByType(Dialog).close();
	if (this._customRegistry.oncomplete)
			this._customRegistry.oncomplete(this);
}

QuiX.ui.File.prototype._getCaption = function() {
    var caption = '';
    if (this.file)
        caption = this.file.name;
	return caption;
}

QuiX.ui.File.prototype.getValue = function() {
    if (this.file)
        return {
            filename: this.file.name,
            tempfile: this.file.tmp_file || null
        }
    else
        return {filename:null, tempfile:null}
}

QuiX.ui.File.prototype.uploadError =  function(f, code, message) {
    this.onerror(new QuiX.Exception(code, message));
}

QuiX.ui.File.prototype.queueError = function(f, code, message) {
    this.onerror(new QuiX.Exception(code, message));
}

QuiX.ui.File.prototype.onerror = function(e) {
    QuiX.displayError(e);
}

//multiple file uploader
QuiX.ui.MultiFile = function(/*params*/) {
	var params = arguments[0] || {};
    params.onunload = QuiX.ui.File.onunload;
    
	this.name = params.name;
	this.method = params.method;
	this.readonly = (params.readonly == 'true' ||
					 params.readonly == true)? true:false;
	
	this.base = QuiX.ui.Widget;
	this.base(params);
	this.selectlist = new QuiX.ui.SelectList({
		width : '100%',
		height : 'this.parent.getHeight(false, memo) - 24',
        multiple : true,
		ondblclick : this.downloadFile
	});
	this.appendChild(this.selectlist);
	
	this.removeButton = new QuiX.ui.FlatButton({
		width : 24,
		height : 24,
		img : '$THEME_URL$images/remove16.gif',
		top : 'this.parent.getHeight(false, memo) - 24',
		left : 'this.parent.getWidth(false, memo) - 24',
        onclick : this.removeSelectedFiles,
		disabled : this.readonly
	});
	this.appendChild(this.removeButton);

    if (params.placeholder) {
        this.addButton = document.desktop.getWidgetById(params.placeholder);
    }
    else {
        this.addButton = new QuiX.ui.Widget({
            width : 24,
            height : 24,
            top : 'this.parent.getHeight(false, memo) - 24',
            left : 'this.parent.getWidth(false, memo) - 48',
            padding : '3,3,3,3',
            border : 1,
            disabled : this.readonly
        });
        this.appendChild(this.addButton);
        this.addButton.div.className = 'btnupload';
    }

    params.multiple = true;
    params.img = params.img || QuiX.getThemeUrl() + 'images/add16.gif';

    var self = this;
    this.attachEvent('onload', function() {
            self.addButton.div.innerHTML =
                '<span id="' + self.addButton._uniqueid + '"></span>';
            self.uploader = QuiX.ui.File._getUploader(
                self, self.addButton._uniqueid, params);
    });
	this.files = [];
    this.upload_queue = [];
    this.total_bytes = 0;
}

QuiX.constructors['multifile'] = QuiX.ui.MultiFile;
QuiX.ui.MultiFile.prototype = new QuiX.ui.Widget;
QuiX.ui.MultiFile.prototype.customEvents =
    QuiX.ui.Widget.prototype.customEvents.concat(['oncomplete']);
// backwards compatibility
var MultiFile = QuiX.ui.MultiFile;

QuiX.ui.MultiFile.prototype.reset = function() {
	this.files = [];
	this.selectlist.clear();
}

QuiX.ui.MultiFile.prototype.fileSelected = function(f) {
    this.upload_queue.push(f);
    this.total_bytes += f.size;
}

QuiX.ui.MultiFile.prototype.beginupload = function(nfiles, queued, tqueued) {
    if (queued > 0) {
        var self = this;
        document.desktop.parseFromString(
            '<dialog xmlns="http://www.innoscript.org/quix" title="" ' +
                    'width="240" height="140" left="center" top="center">' +
                '<wbody>' +
                    '<progressbar width="90%" height="24" left="center" top="20" ' +
                            'maxvalue="' + this.total_bytes + '">' +
                        '<label align="center" width="100%" height="100%"/>' +
                    '</progressbar>' +
                    '<progressbar width="90%" height="24" left="center" top="50" ' +
                            'maxvalue="100">' +
                        '<label align="center" width="100%" height="100%" caption="0%"/>' +
                    '</progressbar>' +
                '</wbody>' +
                '<dlgbutton width="70" height="22" caption="CANCEL"/>' +
            '</dialog>',
            function (dlg) {
                self.attributes.pbars =
                    dlg.getWidgetsByType(ProgressBar);
                self.attributes.bytesSent = 0;
                dlg.buttons[0].attachEvent('onclick',
                    function (evt, w) {
                        var f;
                        while (self.upload_queue.length > 0) {
                            f = self.upload_queue.shift();
                            self.uploader.cancelUpload(f.id, false);
                        }
                        dlg.close();
                    }
                );
                self.uploader.startUpload();
            }
        );
    }
}

QuiX.ui.MultiFile.prototype.removeSelectedFiles = function(evt, btn) {
	var mf = btn.parent
	mf.selectlist.removeSelected();
	mf.files = [];
	var opts = mf.selectlist.options;
	for (var i=0; i<opts.length; i++) {
		mf.files.push(opts[i].attributes.fileinfo);
	}
}

QuiX.ui.MultiFile.prototype.getValue = function() {
	return this.files;
}

QuiX.ui.MultiFile.prototype.addFile = function(params) {
	var fileinfo = {
        id : params.id || '',
        filename : params.name || params.filename,
        temp_file : params.tmpfile || ''
    }
    this.files.push(fileinfo);
    
	var opt = this.selectlist.addOption({
		caption : fileinfo.filename,
		value : fileinfo.id,
		img : params.img || '$THEME_URL$images/document.gif'
	});
	opt.attributes.fileinfo = fileinfo;
}

QuiX.ui.MultiFile.prototype.downloadFile = function(evt, w) {
	if (w.selection.length == 1 && w.selection[0].value)
		window.location.href = QuiX.root + w.selection[0].value +
                               '?cmd=' + w.parent.method;
}

QuiX.ui.MultiFile.prototype.updateProgress = function(file, bytes_complete, total_bytes) {
	var pbar1 = this.attributes.pbars[0];
	var pbar2 = this.attributes.pbars[1];
	pbar1.setValue(this.attributes.bytesSent + bytes_complete);
    pbar1.widgets[1].setCaption(file.name);
	pbar2.setValue(bytes_complete);
	pbar2.widgets[1].setCaption(
        parseInt((bytes_complete/total_bytes)*100) + '%');
}

QuiX.ui.MultiFile.prototype.uploadSuccess = function(file, server_data, response) {
    this.upload_queue[0].tmpfile = server_data;
    this.upload_queue[0].img = '$THEME_URL$images/file_temporary.gif';
}

QuiX.ui.MultiFile.prototype.uploadComplete = function(file) {
    if (this.upload_queue.length > 0) {
        var current_file = this.upload_queue.shift();
        this.addFile(current_file);
        this.attributes.bytesSent += current_file.size;

        if (this.upload_queue.length > 0) {
            this.uploader.startUpload();
        }
        else {
            this.attributes.pbars[0].getParentByType(Dialog).close();
            if (this._customRegistry.oncomplete)
                this._customRegistry.oncomplete(this);
            this.total_bytes = 0;
        }
    }
}

QuiX.ui.MultiFile.prototype.uploadError =  function(f, code, message) {
    this.onerror(new QuiX.Exception(code, message));
}

QuiX.ui.MultiFile.prototype.queueError = function(f, code, message) {
    this.onerror(new QuiX.Exception(code, message));
}

QuiX.ui.MultiFile.prototype.onerror = function(e) {
    QuiX.displayError(e);
}