/************************
File Control
************************/
QuiX.ui.File = function(/*params*/) {
	var params = arguments[0] || {};

	params.height = params.height || 20;
	this.name = params.name;
	this.filename = params.filename;
	this.size = params.size || 0;
	this.filetypes = params.filetypes || '*';
	
	this._tmpfile = '';
	this._fileid = null;
	this.href = params.href;
	
	this.cancelUpload = false;
	this.readonly = (params.readonly=='true' ||
					 params.readonly==true)?true:false;
	this.maxFileSize = parseInt(params.maxfilesize) || 0;
	
	params.caption = '...';
	params.type = 'menu';

	this.base = QuiX.ui.FlatButton;
	this.base(params);
	
	if (this.filename) this.setCaption(this._getCaption());
	
	var self = this;
	
	this.contextMenu.addOption({
		img : '$THEME_URL$images/upload.gif',
		caption : 'Upload file',
		onclick : function(evt, w){self.showUploadDialog();}
	});
	this.contextMenu.addOption({
		img : '$THEME_URL$images/download.gif',
		caption : 'Download file',
		onclick : function(evt, w){self.openDocument();}
	});
	
	if (!this.href)
		this.contextMenu.options[1].disable();
	if (this.readonly)
		this.contextMenu.options[0].disable();
	else {
		//TODO: applet is depreciated. use object instead
		var applet = document.getElementById('_uploaderapplet');
		if (!applet) {
			applet = ce('APPLET');
			applet.id = '_uploaderapplet';
			applet.code = 'ReadFile.class';
			applet.archive = QuiX.baseUrl + "ui/ReadFile.jar";
			applet.style.width = "1px";
			applet.style.height = "1px";
			applet.style.visibility = 'hidden';
			document.body.appendChild(applet);
		}
		this.uploader = applet;
	}
}

QuiX.constructors['file'] = QuiX.ui.File;
QuiX.ui.File.prototype = new QuiX.ui.FlatButton;
QuiX.ui.File.prototype.customEvents =
    QuiX.ui.FlatButton.prototype.customEvents.concat(['oncomplete']);
// backwards compatibility
var File = QuiX.ui.File;

QuiX.ui.File.FileInfo = function() {
	this.filename = '';
	this.id = '';
	this.temp_file = '';
}

QuiX.ui.File.prototype.openDocument = function() {
	window.location.href = this.href;
}

QuiX.ui.File.prototype._checkFileSize = function(/*size*/) {
	if (this.maxFileSize == 0)
        return;
    var size = arguments[0] || this.size;
	if (size > parseInt(this.maxFileSize)) {
		this.cancelUpload = true;
        throw new QuiX.Exception('QuiX.ui.File',
            'The maximum allowed size per file is ' + this.maxFileSize +
            ' bytes.');
	}
}

QuiX.ui.File.prototype.showUploadDialog = function() {
    var self = this;
    window.setTimeout(
        function() {
            var fileName = self.uploader.selectFiles(false, self.filetypes);
            if (fileName != '') {
                self.setFile(fileName.toString());
                try {
                    self.beginupload();
                    self.upload();
                }
                catch (e) {
                    self.onerror(e);
                }
            }
        }, 100);
}

QuiX.ui.File.prototype.beginupload = function() {
    this._checkFileSize();
    var self = this;
	document.desktop.parseFromString(
		'<dialog xmlns="http://www.innoscript.org/quix" title="'
				+ this.contextMenu.options[0].getCaption() + '" ' +
				'width="240" height="90" left="center" top="center">' +
			'<wbody>' +
				'<progressbar width="90%" height="20" left="center" top="center" ' +
						'maxvalue="' + this.size + '">' +
					'<label align="center" width="100%" height="100%" caption="0%"/>' +
				'</progressbar>' +
			'</wbody>' +
			'<dlgbutton width="70" height="22" caption="' +
				document.desktop.attributes.CANCEL + '"/>' +
		'</dialog>',
		function(w) {
			var progressDialog = w;
			self.attributes.pbar =
                progressDialog.getWidgetsByType(ProgressBar)[0];
			progressDialog.buttons[0].attachEvent('onclick',
				function (evt, w) {
					self.cancelUpload = true;
					progressDialog.close();
				}
			);
		}
	);
}

QuiX.ui.File.prototype.onstatechange = function() {
	var bytes = parseInt(this.uploader.
                         getBytesRead(this._fileid).toString());
	var pbar = this.attributes.pbar;
	pbar.setValue(bytes);
	pbar.widgets[1].setCaption(parseInt((bytes / pbar.maxvalue) * 100) + '%');
}

QuiX.ui.File.prototype.oncomplete = function() {
	this.attributes.pbar.getParentByType(Dialog).close();
	if (this._customRegistry.oncomplete)
			this._customRegistry.oncomplete(this);
}

QuiX.ui.File.prototype.onerror = function(e) {
    QuiX.displayError(e);
}

QuiX.ui.File.prototype._getCaption = function() {
	return '<b>' + this.filename  + '</b>&nbsp;' +
		'(' + parseInt(this.size/1024) + 'KB)&nbsp;&nbsp;';
}

QuiX.ui.File.prototype.setFile = function(path) {
	this._fileid = this.uploader.setFile(path);
	this.filename = this.getFileName(path);
	this.size = parseInt(this.uploader.getFileSize(this._fileid).toString());
	this.cancelUpload = false;
}

QuiX.ui.File.prototype.getFileName = function(path) {
	path = path.replace(/\\/g, '/');
	var arrPath = path.split('/');
	return(arrPath[arrPath.length-1]);
}

QuiX.ui.File.prototype.getValue = function() {
	return {
		filename: this.filename,
		tempfile: this._tmpfile
	};
}

QuiX.ui.File.prototype.saveTextFile = function(fname, text) {
	this.uploader.saveFile(fname, text);
}

QuiX.ui.File.prototype.upload = function() {
	var ch_size = parseInt((this.size/20)/8192) * 8192;
	if (ch_size<8192) ch_size = 8192;
	if (ch_size>65536) ch_size = 65536;
	this.uploader.ChunkSize = ch_size;
	var chunk = this.uploader.getChunk(this._fileid);
	this._upload(chunk, false);
}

QuiX.ui.File.prototype._upload = function(chunk, fname) {
	var self = this;
	var rpc = new QuiX.rpc.JSONRPCRequest(QuiX.root);
    rpc.use_cache = false;
	rpc.oncomplete = function(req) {
		if (!self.cancelUpload) {
			var chunk = self.uploader.getChunk(self._fileid);
			var filename = req.response;
			if (chunk != '' && chunk != null) {
                self.onstatechange();
				self._upload(chunk, filename);
			}
			else {
				self.setCaption(self._getCaption());
				self._tmpfile = filename;
                self.oncomplete();
			}
		} else {
			self.cancelUpload = false;
		}
	}
	rpc.onerror = function(e) {
        self.attributes.pbar.getParentByType(Dialog).close();
        self.onerror(e);
	}
	rpc.callmethod('upload', new String(chunk), fname);
	delete chunk;
}

//multiple file uploader
QuiX.ui.MultiFile = function(/*params*/) {
	var params = arguments[0] || {};
	this.name = params.name;
	this.method = params.method;
	this.readonly = (params.readonly=='true' ||
					 params.readonly==true)?true:false;
	this.filetypes = params.filetypes || '*';
	
	this.base = QuiX.ui.Widget;
	this.base(params);
	
	this.selectlist = new QuiX.ui.SelectList({
		width : '100%',
		height : 'this.parent.getHeight(false, memo)-24',
		ondblclick : this.downloadFile
	});
	this.appendChild(this.selectlist);
	
	this.removeButton = new QuiX.ui.FlatButton({
		width : 24,
		height : 24,
		img : '$THEME_URL$images/remove16.gif',
		top : 'this.parent.getHeight(false, memo)-24',
		left : 'this.parent.getWidth(false, memo)-24',
		disabled : this.readonly
	});
	this.appendChild(this.removeButton);
	
	this.addButton = new QuiX.ui.FlatButton({
		width : 24,
		height : 24,
		img : '$THEME_URL$images/add16.gif',
		top : 'this.parent.getHeight(false, memo)-24',
		left : 'this.parent.getWidth(false, memo)-48',
		disabled : this.readonly
	});
	this.appendChild(this.addButton);
	
	var self = this;
	if (!this.readonly) {
		this.filecontrol = new File({maxfilesize:params.maxfilesize});
		this.appendChild(this.filecontrol);
		this.filecontrol.div.style.visibility = 'hidden';
		this.filecontrol.onstatechange = function() {
            self.onstatechange();
        }
		this.filecontrol.oncomplete = function() {
            self.onfilecomplete();
        }
		this.addButton.attachEvent('onclick', this.showUploadDialog);
		this.removeButton.attachEvent('onclick', this.removeSelectedFiles);
	}
	this.files = [];
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

QuiX.ui.MultiFile.prototype.showUploadDialog = function(evt, btn) {
	var mf = btn.parent;
    window.setTimeout(
        function() {
            var filenames = mf.filecontrol.uploader.selectFiles(true,
                                                                mf.filetypes);
            if (filenames != '') mf.beginUpload(filenames);
        }, 100);
	QuiX.stopPropag(evt);
}

QuiX.ui.MultiFile.prototype.beginUpload = function(filenames) {
    var fileid, file_size;
    var files = new String(filenames).split(';');
    files = files.slice(0, files.length-1).reverse();
    this.files4upload = [];
    var total_size = 0;
    for (var i=0; i<files.length; i++) {
        fileid = this.filecontrol.uploader.setFile(files[i]);
        file_size = parseInt(
            this.filecontrol.uploader.getFileSize(fileid).toString());
        try {
            this.filecontrol._checkFileSize(file_size);
        }
        catch(e) {
            this.filecontrol.onerror(e);
            return;
        }

        this.files4upload.push({
            path: files[i],
            filename: this.filecontrol.getFileName(files[i]),
            size: file_size
        });
        total_size += file_size;
        this.filecontrol.uploader.closeFile(fileid);
    }

    this.current_file = this.files4upload.pop();
    this.filecontrol.setFile(this.current_file.path);
    this._tmpsize = this.current_file.size;

    var self = this;

    document.desktop.parseFromString(
        '<dialog xmlns="http://www.innoscript.org/quix" title="' +
                this.filecontrol.contextMenu.options[0].getCaption() + '" ' +
                'width="240" height="140" left="center" top="center">' +
            '<wbody>' +
                '<progressbar width="90%" height="24" left="center" top="20" ' +
                        'maxvalue="' + total_size + '">' +
                    '<label align="center" width="100%" height="100%" caption="' +
                        this.current_file.filename + '"/>' +
                '</progressbar>' +
                '<progressbar width="90%" height="24" left="center" top="50" ' +
                        'maxvalue="' + this.current_file.size + '">' +
                    '<label align="center" width="100%" height="100%" caption="0%"/>' +
                '</progressbar>' +
            '</wbody>' +
            '<dlgbutton width="70" height="22" caption="CANCEL"/>' +
        '</dialog>',
        function (dlg) {
            self.filecontrol.attributes.pbar1 =
                self.filecontrol.attributes.pbar =
                dlg.getWidgetsByType(ProgressBar)[0];
            self.filecontrol.attributes.pbar2 =
                dlg.getWidgetsByType(ProgressBar)[1];
            self.filecontrol.attributes.bytesRead = 0;
            dlg.buttons[0].attachEvent('onclick',
                function (evt, btn) {
                    self.filecontrol.cancelUpload = true;
                    btn.getParentByType(Dialog).close();
                }
            );
            self.filecontrol.upload();
        }
    );
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
	return(this.files);
}

QuiX.ui.MultiFile.prototype.addFile = function(params) {
	var oFileInfo = new QuiX.ui.File.FileInfo();
	
	oFileInfo.id = params.id || '';
	oFileInfo.filename = params.filename;
	oFileInfo.temp_file = params.tmpfile || '';
	var fileimage = params.img || '$THEME_URL$images/document.gif';
	
	this.files.push(oFileInfo);
	var opt = this.selectlist.addOption({
		caption : oFileInfo.filename,
		value : oFileInfo.id,
		img : fileimage
	});
	
	opt.attributes.fileinfo = oFileInfo;
}

QuiX.ui.MultiFile.prototype.downloadFile = function(evt, w) {
	if (w.selection.length == 1 && w.selection[0].value)
		window.location.href = QuiX.root + w.selection[0].value +
                               '?cmd=' + w.parent.method;
}

QuiX.ui.MultiFile.prototype.onstatechange = function() {
    var fc = this.filecontrol;
	var bytes = parseInt(fc.uploader.getBytesRead(fc._fileid).
                         toString());
	var pbar1 = fc.attributes.pbar1;
	var pbar2 = fc.attributes.pbar2;
	
	pbar1.setValue(fc.attributes.bytesRead + bytes);
	
	pbar2.setValue(bytes);
	pbar2.widgets[1].setCaption(parseInt((bytes/pbar2.maxvalue)*100) + '%');
}

QuiX.ui.MultiFile.prototype.onfilecomplete = function() {
    var fc = this.filecontrol;
	var pbar1 = fc.attributes.pbar1;
	var pbar2 = fc.attributes.pbar2;
	var file = this.current_file;
	var remaining_files = this.files4upload;
	
	this.addFile({
		filename : file.filename,
		tmpfile : fc._tmpfile,
		img : '$THEME_URL$images/file_temporary.gif'
	});

	if (remaining_files.length > 0) {
		this.current_file = remaining_files.pop();
		pbar1.widgets[1].setCaption(this.current_file.filename);
		pbar2.setValue(0);
		pbar2.maxvalue = this.current_file.size;
		pbar2.widgets[1].setCaption('0%');
		fc.attributes.bytesRead += this._tmpsize;

		this._tmpsize = this.current_file.size;
		fc.setFile(this.current_file.path);
		fc.upload();
	}
    else {
		fc.attributes.pbar.getParentByType(Dialog).close();
		if (this._customRegistry.oncomplete)
			this._customRegistry.oncomplete(this);
	}	
}
