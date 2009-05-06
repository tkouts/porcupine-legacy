/************************
File Control
************************/
function FileInfo() {
	this.filename = '';
	this.id = '';
	this.temp_file = '';
}

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
	
	var oFile = this;
	
	this.contextMenu.addOption({
		img : '$THEME_URL$images/upload.gif',
		caption : 'Upload file',
		onclick : function(evt, w){oFile.showUploadDialog()}
	});
	this.contextMenu.addOption({
		img : '$THEME_URL$images/download.gif',
		caption : 'Download file',
		onclick : function(evt, w){oFile.openDocument()}
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

QuiX.ui.File.prototype.openDocument = function() {
	window.location.href = this.href;
}

QuiX.ui.File.prototype._checkFileSize = function(size) {
	if (this.maxFileSize == 0)
		return true;
	if (size > parseInt(this.maxFileSize)) {
		document.desktop.msgbox("Error", 
			'The maximum allowed size per file is ' +
                this.maxFileSize + ' bytes.',
			[['OK', 60]],
			'desktop/images/messagebox_warning.gif',
            'center', 'center', 280, 112);
		this.cancelUpload = true;
		return false;
	}
	return true;
}

QuiX.ui.File.prototype.showUploadDialog = function() {
	var fileName = this.uploader.selectFiles(false, this.filetypes);
	if (fileName != '') {
		this.setFile(new String(fileName));
		this.onbeginupload(this);
		this.upload();
	}
}

QuiX.ui.File.prototype.onbeginupload = function(filecontrol) {
	if (!this._checkFileSize(filecontrol.size))
		return;
	document.desktop.parseFromString(
		'<dialog xmlns="http://www.innoscript.org/quix" title="'
				+ filecontrol.contextMenu.options[0].getCaption() + '" ' +
				'width="240" height="90" left="center" top="center">' +
			'<wbody>' +
				'<progressbar width="90%" height="20" left="center" top="center" ' +
						'maxvalue="' + filecontrol.size + '">' +
					'<label align="center" width="100%" height="100%" caption="0%"/>' +
				'</progressbar>' +
			'</wbody>' +
			'<dlgbutton width="70" height="22" caption="' +
				document.desktop.attributes.CANCEL + '"/>' +
		'</dialog>',
		function(w) {
			var progressDialog = w;
			filecontrol.attributes.pbar =
                progressDialog.getWidgetsByType(ProgressBar)[0];
			progressDialog.buttons[0].attachEvent('onclick',
				function (evt, w) {
					filecontrol.cancelUpload = true;
					progressDialog.close();
				}
			);
		}
	);
}

QuiX.ui.File.prototype.onstatechange = function(filecontrol) {
	var bytes = parseInt(filecontrol.uploader.
                         getBytesRead(filecontrol._fileid).toString());
	var pbar = filecontrol.attributes.pbar;
	pbar.setValue(bytes);
	pbar.widgets[1].setCaption(parseInt((bytes/pbar.maxvalue)*100) + '%');
}

QuiX.ui.File.prototype.oncomplete =
QuiX.ui.File.prototype.onerror = function(filecontrol) {
	filecontrol.attributes.pbar.getParentByType(Dialog).close();
	if (filecontrol._customRegistry.oncomplete)
			filecontrol._customRegistry.oncomplete(filecontrol);
	
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
	var oFile = this;
	var xmlrpc = new XMLRPCRequest(QuiX.root);
    xmlrpc.use_cache = false;
	xmlrpc.oncomplete = function(req) {
		if (!oFile.cancelUpload) {
			var chunk = oFile.uploader.getChunk(oFile._fileid);
			var filename = req.response;
			if (chunk!='' && chunk!=null) {
				if (oFile.onstatechange) oFile.onstatechange(oFile);
				oFile._upload(chunk, filename);
			}
			else {
				oFile.setCaption(oFile._getCaption());
				oFile._tmpfile = filename;
				if (oFile.oncomplete) oFile.oncomplete(oFile);
			}
		} else {
			oFile.cancelUpload = false;
		}
	}
	xmlrpc.onerror = function(req) {
		if (oFile.onerror) oFile.onerror(oFile);
	}
	xmlrpc.callmethod('upload', new String(chunk), fname);
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
	
	var oMultiFile = this;
	if (!this.readonly) {
		this.filecontrol = new File({maxfilesize:params.maxfilesize});
		this.appendChild(this.filecontrol);
		this.filecontrol.div.style.visibility = 'hidden';
		this.filecontrol.onstatechange = this.statechange;
		this.filecontrol.oncomplete =
            this.filecontrol.onerror = this.onfilecomplete;
		this.addButton.attachEvent('onclick', oMultiFile.showUploadDialog);
		this.removeButton.attachEvent('onclick', oMultiFile.removeSelectedFiles);
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
	var file_size;
	var mf = btn.parent;
	var filenames = mf.filecontrol.uploader.selectFiles(true, mf.filetypes);
	
	if (filenames != '') {
		var fileid;
		var files = new String(filenames).split(';');
		files = files.slice(0, files.length-1).reverse();
		mf.files4upload = [];
		var total_size = 0;
		for (var i=0; i<files.length; i++) {
			fileid = mf.filecontrol.uploader.setFile(files[i]);
			file_size = parseInt(
                        mf.filecontrol.uploader.getFileSize(fileid).toString());
			if (!mf.filecontrol._checkFileSize(file_size)) {
				QuiX.stopPropag(evt);
				return;
			}
			mf.files4upload.push({
				path: files[i],
				filename: mf.filecontrol.getFileName(files[i]),
				size: file_size
			});			
			total_size += file_size;
			mf.filecontrol.uploader.closeFile(fileid);
		}
		
		mf.current_file = mf.files4upload.pop();
		mf.filecontrol.setFile(mf.current_file.path);
		mf._tmpsize = mf.current_file.size;
		
		document.desktop.parseFromString(
			'<dialog xmlns="http://www.innoscript.org/quix" title="' +
					mf.filecontrol.contextMenu.options[0].getCaption() + '" ' +
					'width="240" height="140" left="center" top="center">' +
				'<wbody>' +
					'<progressbar width="90%" height="24" left="center" top="20" ' +
							'maxvalue="' + total_size + '">' +
						'<label align="center" width="100%" height="100%" caption="' +
							mf.current_file.filename + '"/>' +
					'</progressbar>' +
					'<progressbar width="90%" height="24" left="center" top="50" ' +
							'maxvalue="' + mf.current_file.size + '">' +
						'<label align="center" width="100%" height="100%" caption="0%"/>' +
					'</progressbar>' +
				'</wbody>' +
				'<dlgbutton width="70" height="22" caption="CANCEL"/>' +
			'</dialog>',
			function (w) {
				mf.filecontrol.attributes.pbar1 = w.getWidgetsByType(ProgressBar)[0];
				mf.filecontrol.attributes.pbar2 = w.getWidgetsByType(ProgressBar)[1];
				mf.filecontrol.attributes.bytesRead = 0;
				w.buttons[0].attachEvent('onclick',
					function (evt, w) {
						mf.filecontrol.cancelUpload = true;
						w.getParentByType(Dialog).close();
					}
				);
				mf.filecontrol.upload();
			}
		);
	}
	QuiX.stopPropag(evt);
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
	var oFileInfo = new FileInfo();
	
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

QuiX.ui.MultiFile.prototype.statechange = function(filecontrol) {
	var bytes = parseInt(filecontrol.uploader.getBytesRead(filecontrol._fileid).
                         toString());
	var pbar1 = filecontrol.attributes.pbar1;
	var pbar2 = filecontrol.attributes.pbar2;
	
	pbar1.setValue(filecontrol.attributes.bytesRead + bytes);
	
	pbar2.setValue(bytes);
	pbar2.widgets[1].setCaption(parseInt((bytes/pbar2.maxvalue)*100) + '%');
}

QuiX.ui.MultiFile.prototype.onfilecomplete = function(filecontrol) {
	var multifile = filecontrol.parent;
	var pbar1 = filecontrol.attributes.pbar1;
	var pbar2 = filecontrol.attributes.pbar2;
	var file = multifile.current_file;
	var remaining_files = multifile.files4upload;
	
	multifile.addFile({
		filename : file.filename,
		tmpfile : filecontrol._tmpfile,
		img : '$THEME_URL$images/file_temporary.gif'
	});

	if (remaining_files.length>0) {
		multifile.current_file = remaining_files.pop();
		pbar1.widgets[1].setCaption(multifile.current_file.filename);
		pbar2.setValue(0);
		pbar2.maxvalue = multifile.current_file.size;
		pbar2.widgets[1].setCaption('0%');
		filecontrol.attributes.bytesRead += multifile._tmpsize;

		multifile._tmpsize = multifile.current_file.size;
		filecontrol.setFile(multifile.current_file.path);
		filecontrol.upload();
	} else {
		filecontrol.attributes.pbar1.getParentByType(Dialog).close();
		if (multifile._customRegistry.oncomplete)
			multifile._customRegistry.oncomplete(multifile);
	}
		
}
