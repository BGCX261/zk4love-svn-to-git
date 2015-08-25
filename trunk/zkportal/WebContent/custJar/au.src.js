
(function () {
	var _errURIs = {}, _errCode,
		_perrURIs = {}, 
		_onErrs = [], 
		cmdsQue = [], 
		ajaxReq, ajaxReqInf, pendingReqInf, ajaxReqTries,
		sendPending, ctlUuid, ctlTime, ctlCmd, responseId,
		seqId = (jq.now() % 9999) + 1, 
		doCmdFns = [],
		idTimeout, 
		pfIndex = 0, 
		_detached = []; 

	
	function checkProgressing() {
		if (!zAu.processing()) {
			_detached = []; 
			zk.endProcessing();
			zAu.doneTime = jq.now();
		}
		try{
			var $progWgt =zk.Widget.$("$"+zk.progressModal.winId);
			$progWgt.setVisible(false);
		}catch(e3){
		}
	}
	function pushReqCmds(reqInf, req) {
		var dt = reqInf.dt,
			rt = req.responseText;
		if (!rt) {
			if (zk.pfmeter) zAu._pfdone(dt, pfGetIds(req));
			return false; 
		}

		var cmds = [];
		cmds.rtags = reqInf.rtags;
		if (zk.pfmeter) {
			cmds.dt = dt;
			cmds.pfIds = pfGetIds(req);
		}

		rt = jq.evalJSON(rt);
		var	rid = rt.rid;
		if (rid) {
			rid = parseInt(rid); 
			if (!isNaN(rid)) cmds.rid = rid;
		}

		pushCmds(cmds, rt.rs);
		return true;
	}
	function pushCmds(cmds, rs) {
		for (var j = 0, rl = rs ? rs.length: 0; j < rl; ++j) {
			var r = rs[j],
				cmd = r[0],
				data = r[1];

			if (!cmd) {
				zAu.showError("ILLEGAL_RESPONSE", "command required");
				continue;
			}

			cmds.push({cmd: cmd, data: data || []});
		}

		cmdsQue.push(cmds);
	}
	function doProcess(cmd, data) { 
		
		var fn = zAu.cmd1[cmd], id;
		if (fn) {
			if (!data.length)
				return zAu.showError("ILLEGAL_RESPONSE", "uuid required", cmd);

			data[0] = zk.Widget.$(id = data[0]); 
				
		} else {
			
			fn = zAu.cmd0[cmd];
			if (!fn)
				return zAu.showError("ILLEGAL_RESPONSE", "Unknown", cmd);
		}
		fn.apply(zAu, data);
	}

	
	function ajaxReqTimeout() {
		
		
		var req = ajaxReq, reqInf = ajaxReqInf;
		if (req && req.readyState < 3) {
			ajaxReq = ajaxReqInf = null;
			try {
				if(typeof req.abort == "function") req.abort();
			} catch (e2) {
			}
			if (reqInf.tmout < 60000) reqInf.tmout += 3000;
				
			ajaxReqResend(reqInf);
		}
	}
	function ajaxReqResend(reqInf, timeout) {
		if (seqId == reqInf.sid) {
			pendingReqInf = reqInf; 
			setTimeout(ajaxReqResend2, timeout ? timeout: 0);
		}
	}
	function ajaxReqResend2() {
		var reqInf = pendingReqInf;
		if (reqInf) {
			pendingReqInf = null;
			if (seqId == reqInf.sid)
				ajaxSendNow(reqInf);
		}
	}
	function onError(req, errCode) {
		
		for (var errs = _onErrs.$clone(), fn; fn = errs.shift();)
			if (fn(req, errCode))
				return true; 
	}
	
	function onResponseReady() {
		var req = ajaxReq, reqInf = ajaxReqInf;
		try {
			if (req && req.readyState == 4) {
				ajaxReq = ajaxReqInf = null;
				if (reqInf.tfn) clearTimeout(reqInf.tfn); 

				if (zk.pfmeter) zAu._pfrecv(reqInf.dt, pfGetIds(req));

				var sid = req.getResponseHeader("ZK-SID"), rstatus;
				if ((rstatus = req.status) == 200) { 
					if (sid && sid != seqId) {
						_errCode = "ZK-SID " + (sid ? "mismatch": "required");
						afterResponse(); 
						return;
					} 

					var v;
					if ((v = req.getResponseHeader("ZK-Error"))
					&& !onError(req, v = zk.parseInt(v)||v)
					&& v == 5501 
					&& zAu.confirmRetry("FAILED_TO_RESPONSE", "out of sequence")) {
						ajaxReqResend(reqInf);
						return;
					}
					if (v != 410) 
						zAu._resetTimeout();

					if (pushReqCmds(reqInf, req)) { 
						
						if (sid && ++seqId > 9999) seqId = 1;
						ajaxReqTries = 0;
						pendingReqInf = null;
					}
				} else if ((!sid || sid == seqId) 
				&& !onError(req, _errCode = rstatus)) {
					var eru = _errURIs['' + rstatus];
					if (typeof eru == "string") {
						zUtl.go(eru);
						return;
					}

					
					
					switch (rstatus) { 
					default:
						if (!ajaxReqTries) break;
						
					case 12002: 
					case 12030: 
					case 12031:
					case 12152: 
					case 12159:
					case 13030:
					case 503: 
						if (!ajaxReqTries) ajaxReqTries = 3; 
						if (--ajaxReqTries) {
							ajaxReqResend(reqInf, 200);
							return;
						}
					}

					if (!reqInf.ignorable && !zk.unloading) {
						var msg = req.statusText;
						if (zAu.confirmRetry("FAILED_TO_RESPONSE", rstatus+(msg?": "+msg:""))) {
							ajaxReqTries = 2; 
							ajaxReqResend(reqInf);
							return;
						}
					}
				}
			}
		} catch (e) {
			if (!window.zAu)
				return; 

			ajaxReq = ajaxReqInf = null;
			try {
				if(req && typeof req.abort == "function") req.abort();
			} catch (e2) {
			}

			
			
			if (reqInf && !reqInf.ignorable && !zk.unloading) {
				var msg = _exmsg(e);
				_errCode = "[Receive] " + msg;
				
				
				if (zAu.confirmRetry("FAILED_TO_RESPONSE", (msg&&msg.indexOf("NOT_AVAILABLE")<0?msg:""))) {
					ajaxReqResend(reqInf);
					return;
				}
			}
		}

		afterResponse();
	}
	function afterResponse() { 
		zAu._doCmds(); 

		
		if (sendPending && !ajaxReq && !pendingReqInf) {
			sendPending = false;
			var dts = zk.Desktop.all;
			for (var dtid in dts)
				ajaxSend2(dts[dtid], 0);
		}
	}
	function _exmsg(e) {
		var msg = e.message||e, m2 = "";
		if (e.name) m2 = " " +e.name;



		return msg + (m2 ? " (" + m2.substring(1) + ")": m2);
	}

	function ajaxSend(dt, aureq, timeout) {
		dt._aureqs.push(aureq);

		ajaxSend2(dt, timeout);
			
	}
	function ajaxSend2(dt, timeout) {
		if (!timeout) timeout = 0;
		if (dt && timeout >= 0)
			setTimeout(function(){zAu.sendNow(dt);}, timeout);
	}
	function ajaxSendNow(reqInf) {
		var setting = zAu.ajaxSettings,
			req = setting.xhr(),
			uri = zjq._useQS(reqInf) ? reqInf.uri + '?' + reqInf.content: null;
		zAu.sentTime = jq.now(); 
		try {
			req.onreadystatechange = onResponseReady;
			req.open("POST", uri ? uri: reqInf.uri, true);
			req.setRequestHeader("Content-Type", setting.contentType);
			req.setRequestHeader("ZK-SID", reqInf.sid);
			if (_errCode) {
				req.setRequestHeader("ZK-Error-Report", _errCode);
				_errCode = null;
			}

			if (zk.pfmeter) zAu._pfsend(reqInf.dt, req);

			ajaxReq = req;
			ajaxReqInf = reqInf;
			if (zk.resendDelay > 0)
				ajaxReqInf.tfn = setTimeout(ajaxReqTimeout, zk.resendDelay + reqInf.tmout);

			if (uri) req.send(null);
			else req.send(reqInf.content);

			
			if(zk.progressModal){
				if(!zk.progressModal.winId){
					jq.alert('Please setup zk.progressModal.winId!', {
						mode:'modal',
						title:'Error',
						icon:'ERROR'
					});
				}else{
					var $progWgt =zk.Widget.$("$"+zk.progressModal.winId);
					if(!$progWgt.isVisible()){
						$progWgt.setVisible(true);
						$progWgt.doModal();
					}
				}
			}
			else{
				if (!reqInf.implicit) zk.startProcessing(zk.procDelay); 
			}

		} catch (e) {
			
			try {
				if(typeof req.abort == "function") req.abort();
			} catch (e2) {
			}

			if (!reqInf.ignorable && !zk.unloading) {
				var msg = _exmsg(e);
				_errCode = "[Send] " + msg;
				if (zAu.confirmRetry("FAILED_TO_SEND", msg)) {
					ajaxReqResend(reqInf);
					return;
				}
			}
		}
	}
	
	function toJSON(target, data) {
		if (!jq.isArray(data)) {
			if (data.pageX != null && data.x == null)  {
				var ofs = target && target.desktop ? 
						target.fromPageCoord(data.pageX, data.pageY):
						[data.pageX, data.pageY];
				data.x = ofs[0];
				data.y = ofs[1];
			}

			for (var n in data) {
				var v;
				if (jq.type(v = data[n]) == 'date') {
					data[n] = jq.d2j(v);
					data["z_type_" + n] = "Date";
				}
			}
		}
		return jq.toJSON(data);
	}

	function doCmdsNow(cmds) {
		var rtags = cmds.rtags||{}, ex;
		try {
			while (cmds && cmds.length) {
				if (zk.mounting) return false;

				var cmd = cmds.shift();
				try {
					doProcess(cmd.cmd, cmd.data);
				} catch (e) {
					zk.mounting = false; 
					zAu.showError("FAILED_TO_PROCESS", null, cmd.cmd, e);
					if (!ex) ex = e;
				}
			}
		} finally {
		
			if (!cmds || !cmds.length) {
				zWatch.fire('onResponse', null, {timeout:0, rtags: rtags}); 
			}
		}
		if (ex)
			throw ex;
		return true;
	}
	function _asBodyChild(child) {
		jq(document.body).append(child);
	}

	
	
	function pfGetIds(req) {
		return req.getResponseHeader("ZK-Client-Complete");
	}
	function pfAddIds(dt, prop, pfIds) {
		if (pfIds && (pfIds = pfIds.trim())) {
			var s = pfIds + "=" + Math.round(jq.now());
			if (dt[prop]) dt[prop] += ',' + s;
			else dt[prop] = s;
		}
	}

	
	function fireClientInfo() {
		zAu.cmd0.clientInfo();
	}
	function sendTimeout() {
		zAu.send(new zk.Event(null, "dummy", null, {ignorable: true, serverAlive: true}));
			
	}

	
	function _wgt2map(wgt, map) {
		map[wgt.uuid] = wgt;
		for (wgt = wgt.firstChild; wgt; wgt = wgt.nextSibling)
			_wgt2map(wgt, map);
	}

	function _beforeAction(wgt, actnm) {
		var act;
		if (wgt._visible && (act = wgt.actions_[actnm])) {
			wgt.z$display = "none"; 
			return act;
		}
	}
	function _afterAction(wgt, act) {
		if (act) {
			delete wgt.z$display;
			act[0].call(wgt, wgt.$n(), act[1]);
			return true;
		}
	}


zAu = {
	_resetTimeout: function () { 
		if (idTimeout) {
			clearTimeout(idTimeout);
			idTimeout = null;
		}
		if (zk.timeout > 0)
			idTimeout = setTimeout(sendTimeout, zk.timeout * 1000);
  	},
	_onClientInfo: function () { 
		if (zAu._cInfoReg) setTimeout(fireClientInfo, 20);
			
			
			
	},
	
	_wgt$: function (uuid) {
		var map = _detached.wgts = _detached.wgts || {}, wgt;
		while (wgt = _detached.shift())
			_wgt2map(wgt, map);
		return map[uuid];
	},

	
	
	onError: function (fn) {
		_onErrs.push(fn);
	},
	
	unError: function (fn) {
		_onErrs.$remove(fn);
	},

	
	confirmRetry: function (msgCode, msg2) {
		var msg = msgzk[msgCode];
		return jq.confirm((msg?msg:msgCode)+'\n'+msgzk.TRY_AGAIN+(msg2?"\n\n("+msg2+")":""));
	},
	
	showError: function (msgCode, msg2, cmd, ex) {
		var msg = msgzk[msgCode];
		zk.error((msg?msg:msgCode)+'\n'+(msg2?msg2+": ":"")+(cmd||"")
				+ (ex?"\n"+_exmsg(ex):""));
	},
	
	getErrorURI: function (code) {
		return _errURIs['' + code];
	},
	
	
	setErrorURI: function (code, uri) {
		if (arguments.length == 1) {
			for (var c in code)
				zAu.setErrorURI(c, code[c]);
		} else
			_errURIs['' + code] = uri;
	},
	
	getPushErrorURI: function (code) {
		return _perrURIs['' + code];
	},
	
	
	setPushErrorURI: function (code, uri) {
		if (arguments.length == 1) {
			for (var c in code)
				zAu.setPushErrorURI(c, code[c]);
			return;
		}
		_perrURIs['' + code] = uri;
	},

	
	
	processing: function () {
		return zk.mounting || cmdsQue.length || ajaxReq || pendingReqInf;
	},

	
	send: function (aureq, timeout) {
		if (timeout < 0)
			aureq.opts = zk.copy(aureq.opts, {defer: true});

		var t = aureq.target;
		if (t) {
			ajaxSend(t.className == 'zk.Desktop' ? t: t.desktop, aureq, timeout);
		} else {
			var dts = zk.Desktop.all;
			for (var dtid in dts)
				ajaxSend(dts[dtid], aureq, timeout);
		}
	},
	
	sendAhead: function (aureq, timeout) {
		var t = aureq.target;
		if (t) {
			var dt = t.className == 'zk.Desktop' ? t: t.desktop;
			dt._aureqs.unshift(aureq);
			ajaxSend2(dt, timeout);
		} else {
			var dts = zk.Desktop.all;
			for (var dtid in dts) {
				dt._aureqs.unshift(aureq);
				ajaxSend2(dts[dtid], timeout);
			}
			return;
		}
	},

	
	_rmDesktop: function (dt, dummy) {
		jq.ajax(zk.$default({
			url: zk.ajaxURI(null, {desktop:dt,au:true}),
			data: {dtid: dt.id, cmd_0: dummy ? "dummy": "rmDesktop", opt_0: "i"},
			beforeSend: function (xhr) {
				if (zk.pfmeter) zAu._pfsend(dt, xhr, true);
			},
			
			
			
			async: !zk.safari
		}, zAu.ajaxSettings), true);
	},

	
	
	process: function (cmd, data) {
		doProcess(cmd, data ? jq.evalJSON(data): []);
	},
	
	shallIgnoreESC: function () {
		return ajaxReq;
	},
	
	doCmds: function (dtid, rs) {
		var cmds = [];
		cmds.dt = zk.Desktop.$(dtid);
		pushCmds(cmds, rs);
		zAu._doCmds();
	},
	_doCmds: function () { 
		for (var fn; fn = doCmdFns.shift();)
			fn();

		var ex, j = 0, rid = responseId;
		for (; j < cmdsQue.length; ++j) {
			if (zk.mounting) return; 

			var cmds = cmdsQue[j];
			if (rid == cmds.rid || !rid || !cmds.rid 
			|| zk.Desktop._ndt > 1) { 
				cmdsQue.splice(j, 1);

				var oldrid = rid;
				if (cmds.rid) {
					if ((rid = cmds.rid + 1) >= 1000)
						rid = 1; 
					responseId = rid;
				}

				try {
					if (doCmdsNow(cmds)) { 
						j = -1; 
						if (zk.pfmeter) {
							var fn = function () {zAu._pfdone(cmds.dt, cmds.pfIds);};
							if (zk.mounting) doCmdFns.push(fn);
							else fn();
						}
					} else { 
						responseId = oldrid; 
						cmdsQue.splice(j, 0, cmds); 
						return; 
					}
				} catch (e) {
					if (!ex) ex = e;
					j = -1; 
				}
			}
		}

		if (cmdsQue.length) { 
			setTimeout(function () {
				if (cmdsQue.length && rid == responseId) {
					var r = cmdsQue[0].rid;
					for (j = 1; j < cmdsQue.length; ++j) { 
						var r2 = cmdsQue[j].rid,
							v = r2 - r;
						if (v > 500 || (v < 0 && v > -500)) r = r2;
					}
					responseId = r;
					zAu._doCmds();
				}
			}, 3600);
		} else
			checkProgressing();

		if (ex) throw ex;
	},

	
	beforeSend: function (uri) {
		return uri;
	},
	
	encode: function (j, aureq, dt) {
		var target = aureq.target,
			opts = aureq.opts||{},
			content = j ? "": "dtid="+dt.id;

		content += "&cmd_"+j+"="+aureq.name
		if ((opts.implicit || opts.ignorable) && !(opts.serverAlive))
			content += "&opt_"+j+"=i";
			

		if (target && target.className != 'zk.Desktop')
			content += "&uuid_"+j+"="+target.uuid;

		var data = aureq.data, dtype = typeof data;
		if (dtype == 'string' || dtype == 'number' || dtype == 'boolean'
		|| jq.isArray(data))
			data = {'':data};
		if (data)
			content += "&data_"+j+"="+encodeURIComponent(toJSON(target, data));
		return content;
	},

	
	sendNow: function (dt) {
		var es = dt._aureqs;
		if (es.length == 0)
			return false;

		if (zk.mounting) {
			zk.afterMount(function(){zAu.sendNow(dt);});
			return true; 
		}

		if (ajaxReq || pendingReqInf) { 
			sendPending = true;
			return true;
		}

		
		var implicit, uri;
		for (var j = 0, el = es.length; j < el; ++j) {
			var aureq = es[j],
				opts = aureq.opts||{};
			if (opts.uri != uri) {
				if (j) break;
				uri = opts.uri;
			}

			
			if (!(implicit = opts.ignorable || opts.implicit || opts.defer))
				break;
		}

		
		try {
			zWatch.fire('onSend', null, implicit);
		} catch (e) {
			zAu.showError("FAILED_TO_SEND", null, null, e);
		}

		
		var ignorable = true;
		for (var j = 0, el = es.length; j < el; ++j) {
			var aureq = es[j],
				opts = aureq.opts||{};
			if ((opts.uri != uri)
			|| !(ignorable = ignorable && opts.ignorable)) 
				break;
		}

		
		var content = "", rtags = {},
			requri = uri || zk.ajaxURI(null, {desktop:dt,au:true});
		for (var j = 0, el = es.length; el; ++j, --el) {
			var aureq = es.shift();
			if ((aureq.opts||{}).uri != uri) {
				es.unshift(aureq);
				break;
			}

			requri = zAu.beforeSend(requri, aureq, dt);
			content += zAu.encode(j, aureq, dt);
			zk.copy(rtags, (aureq.opts||{}).rtags);
		}

		if (content)
			ajaxSendNow({
				sid: seqId, uri: requri, dt: dt, content: content,
				implicit: implicit, 
				ignorable: ignorable, tmout: 0, rtags: rtags
			});
		return true;
	},
	
	ajaxSettings: zk.$default({
		global: false,
		contentType: "application/x-www-form-urlencoded;charset=UTF-8"
	}, jq.ajaxSettings),

	
	
	_pfrecv: function (dt, pfIds) {
		pfAddIds(dt, '_pfRecvIds', pfIds);
	},
	
	
	_pfdone: function (dt, pfIds) {
		pfAddIds(dt, '_pfDoneIds', pfIds);
	},
	
	
	_pfsend: function (dt, req, completeOnly) {
		if (!completeOnly)
			req.setRequestHeader("ZK-Client-Start",
				dt.id + "-" + pfIndex++ + "=" + Math.round(jq.now()));

		var ids;
		if (ids = dt._pfRecvIds) {
			req.setRequestHeader("ZK-Client-Receive", ids);
			dt._pfRecvIds = null;
		}
		if (ids = dt._pfDoneIds) {
			req.setRequestHeader("ZK-Client-Complete", ids);
			dt._pfDoneIds = null;
		}
	},

	
	createWidgets: function (codes, fn, filter) {
		
		var wgts = [], len = codes.length;
		if (len > 0) {
			for (var j = 0; j < len; ++j)
				zkx_(codes[j], function (newwgt) {
					wgts.push(newwgt);
					if (wgts.length == len)
						fn(wgts);
				}, filter);
		} else
			fn(wgts);
	},

	
	wrongValue_: function(wgt, msg) {
		if (msg !== false)
			jq.alert(msg);
	}

	
	
	
	
};



zAu.cmd0 =  { 
	
	bookmark: function (bk, replace) {
		zk.bmk.bookmark(bk, replace);
	},
	
	obsolete: function (dtid, msg) {
		if (msg.startsWith("script:"))
			return $eval(msg.substring(7));

		var v = zk.Desktop.$(dtid);
		if (v && (v = v.requestPath))
			msg = msg.replace(dtid, v + ' (' + dtid + ')');

		jq.alert(msg, {
			icon: 'ERROR',
			button: {
				Reload: function () {location.reload();},
				Cancel: true
			}
		});
	},
	
	alert: function (msg, title, icon) {
		jq.alert(msg, {icon: icon||'ERROR', title: title});
	},
	
	redirect: function (url, target) {
		try {
			zUtl.go(url, {target: target});
		} catch (ex) {
			if (!zk.confirmClose) throw ex;
		}
	},
	
	title: function (title) {
		document.title = title;
	},
	
	log: zk.log,
	
	script: function (script) {
		jq.globalEval(script);
	},
	
	echo: function (dtid) {
		zAu.send(new zk.Event(zk.Desktop.$(dtid), "dummy", null, {ignorable: true}));
	},
	
	

	
	clientInfo: function (dtid) {
		zAu._cInfoReg = true;
		zAu.send(new zk.Event(zk.Desktop.$(dtid), "onClientInfo", 
			[new Date().getTimezoneOffset(),
			screen.width, screen.height, screen.colorDepth,
			jq.innerWidth(), jq.innerHeight(), jq.innerX(), jq.innerY()],
			{implicit:true}));
	},
	
	download: function (url) {
		if (url) {
			var ifr = jq('#zk_download')[0];
			if (ifr) {
				ifr.src = url; 
			} else {
				var html = '<iframe src="'+url
				+'" id="zk_download" name="zk_download" style="visibility:hidden;width:0;height:0;border:0" frameborder="0"></iframe>';
				jq(document.body).append(html);
			}
		}
	},
	
	print: function () {
		window.print();
	},
	
	scrollBy: function (x, y) {
		window.scrollBy(x, y);
	},
	
	scrollTo: function (x, y) {
		window.scrollTo(x, y);
	},
	
	resizeBy: function (x, y) {
		window.resizeBy(x, y);
	},
	
	resizeTo: function (x, y) {
		window.resizeTo(x, y);
	},
	
	moveBy: function (x, y) {
		window.moveBy(x, y);
	},
	
	moveTo: function (x, y) {
		window.moveTo(x, y);
	},
	
	cfmClose: function (msg) {
		zk.confirmClose = msg;
	},
	
	
	showBusy: function (uuid, msg) {
		if (arguments.length == 1) {
			msg = uuid;
			uuid = null;
		}

		zAu.cmd0.clearBusy(uuid);

		var w = uuid ? zk.Widget.$(uuid): null;
		if (!uuid)
			zUtl.progressbox("zk_showBusy", msg || msgzk.PLEASE_WAIT, true, null, {busy:true});
		else if (w) {
			w.effects_.showBusy = new zk.eff.Mask( {
				id: w.uuid + "-shby",
				anchor: w.$n(),
				message: msg
			});
		}
	},
	
	
	clearBusy: function (uuid) {
		var w = uuid ? zk.Widget.$(uuid): null,
			efs = w ? w.effects_: null;
		if (efs && efs.showBusy) {
			efs.showBusy.destroy();
			delete efs.showBusy;
		}

		if (!uuid)
			zUtl.destroyProgressbox("zk_showBusy", {busy:true}); 
	},
	
	clearWrongValue: function () {
		for (var i = arguments.length; i--;) {
			var wgt = zk.Widget.$(arguments[i]);
			if (wgt)
				if (wgt.clearErrorMessage)
					wgt.clearErrorMessage();
				else
					zAu.wrongValue_(wgt, false);
		}
	},
	
	wrongValue: function () {
		for (var i = 0, len = arguments.length - 1; i < len; i += 2) {
			var uuid = arguments[i], msg = arguments[i + 1],
				wgt = zk.Widget.$(uuid);
			if (wgt) {
				if (wgt.setErrorMessage) wgt.setErrorMessage(msg);
				else zAu.wrongValue_(wgt, msg);
			} else if (!uuid) 
				jq.alert(msg);
		}
	},
	
	submit: function (id) {
		setTimeout(function (){
			var n = zk.Widget.$(id);
			if (n && n.submit)
				n.submit();
			else
				zk(id).submit();
		}, 50);
	},
	
	scrollIntoView: function (id) {
		var w = zk.Widget.$(id);
		if (w) w.scrollIntoView();
		else zk(id).scrollIntoView();
	}
};

zAu.cmd1 =  {
	
	setAttr: function (wgt, nm, val) {
		if (nm == 'z$pk') zk.load(val); 
		else if (nm == 'z$al') { 
			zk.afterLoad(function () {
				for (nm in val)
					wgt.set(nm, val[nm]()); 
			});
		} else
			wgt.set(nm, val, true); 
	},
	
	outer: function (wgt, code) {
		zkx_(code, function (newwgt) {
			var act = _beforeAction(newwgt, "invalidate");
			wgt.replaceWidget(newwgt);
			_afterAction(newwgt, act);
		}, function (wx) {
			for (var w = wx; w; w = w.parent)
				if (w == wgt)
					return null; 
			return wx;
		});
	},
	
	
	addAft: function (wgt) {
		for (var args = arguments, j = args.length; --j;)
			zkx_(args[j], function (child) {
				var p = wgt.parent,
					act = _beforeAction(child, "show");
				if (p) {
					p.insertBefore(child, wgt.nextSibling);
					if (p.$instanceof(zk.Desktop))
						_asBodyChild(child);
				} else {
					var n = wgt.$n();
					if (n)
						jq(n).after(child, wgt.desktop);
					else
						_asBodyChild(child);
				}
				if (!_afterAction(child, act) && !child.z_rod)
					zUtl.fireSized(child);
			});
	},
	
	addBfr: function (wgt) {
		for (var args = arguments, j = 1; j < args.length; ++j)
			zkx_(args[j], function (child) {
				var act = _beforeAction(child, "show");
				wgt.parent.insertBefore(child, wgt);
				if (!_afterAction(child, act) && !child.z_rod)
					zUtl.fireSized(child);
			});
	},
	
	addChd: function (wgt) {
		for (var args = arguments, j = 1; j < args.length; ++j)
			if (wgt)
				zkx_(args[j], function (child) {
					var act = _beforeAction(child, "show");
					wgt.appendChild(child);
					if (!_afterAction(child, act) && !child.z_rod)
						zUtl.fireSized(child);
				});
			else 
				zkx_(args[j], _asBodyChild);
	},
	
	rm: function (wgt) {
		if (wgt) {
			wgt.detach();
			_detached.push(wgt); 
		}
	},
	
	uuid: function (wgt, newId) {
		if (wgt)
			zk._wgtutl.setUuid(wgt, newId); 
	},

	
	focus: function (wgt) {
		if (wgt)
			wgt.focus(0); 
	},
	
	select: function (wgt, s, e) {
		if (wgt.select) wgt.select(s, e);
	},
	
	invoke: function (wgt, func, vararg) {
		var args = [];
		for (var j = arguments.length; --j > 1;)
			args.unshift(arguments[j]);
		wgt[func].apply(wgt, args);
	},
	
	echo2: function (wgt, evtnm, data) {
		zAu.send(new zk.Event(wgt, "echo",
			data != null ? [evtnm, data]: [evtnm], {ignorable: true}));
	},
	
	resizeWgt: function (wgt) {
		zUtl.fireSized(wgt, 1); 
	}
};
})();

function onIframeURLChange(uuid, url) { 
	if (!zk.unloading) {
		var wgt = zk.Widget.$(uuid);
		if (wgt) wgt.fire("onURIChange", url);
	}
};
