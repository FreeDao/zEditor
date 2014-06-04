/***************************************************************

 * ZCodeEditor代码编辑器
 * Author: zooble
 * Email: wenliang.web@gmail.com

 * @ param editorWrap(string)			编辑器外框class
 * @ param historyStep(number)			历史记录记录多少步

 * 默认文本14px 默认行高21px
 * 会引起内容变化的操作：
   enter/space/tab/delete/backspace
   _fillWord 函数

 ***************************************************************/
function ZCodeEditor(cfg){
	var _default = {
		//自定义外框
		editorWrap: '',
		//光标透明度
		opacity: 1,
		//光标闪烁
		blink: null,
		//光标实时坐标 相对于contentWrap
		curPos: {x: 0, y: 0},
		//光标所在p的实时尺寸
		curPSize: {x: 0, y: 0},
		//contentWrap偏移
		contentWrapOffset: {x: 0, y: 0},
		//所有的p的自定义标记
		pArr: [],
		//正在产生选区
		isSelecting: false,
		//是否有选区
		hasSelection: false,
		//往后选1， 往前选-1
		selectForward: 1,
		//选区起始坐标
		selectStartPos: null,
		//选区经过坐标
		selectRuningPos: null,
		//选区结束坐标
		selectEndPos: null,
		//历史记录
		historyStep: 10,
		//历史记录游标
		historyCursor: -1,
		historyArr: [],
		baseHtml: '<div class="Z-Code-Editor" unselectable="on" >\
						<div class="z-gutter-wrap">\
							<ul class="z-gutter"></ul>\
						</div>\
						<div class="z-content-wrap">\
							<textarea class="z-textarea"></textarea>\
							<div class="z-cursor"></div>\
							<div class="z-tool"></div>\
							<div class="z-content"></div>\
							<div class="z-selection"></div>\
						</div>\
					</div>',
		baseStyle: '<style type="text/css" id="ZCodeEditorCss">ul,li{margin:0;padding:0;list-style:none}.Z-Code-Editor::-webkit-scrollbar{width:10px;height:10px}.Z-Code-Editor::-webkit-scrollbar-track-piece{background:-webkit-gradient( linear,left top,right top,color-stop(0%,rgba(76,76,76,1)),color-stop(0%,rgba(89,89,89,1)),color-stop(0%,rgba(102,102,102,1)),color-stop(0%,rgba(71,71,71,1)),color-stop(0%,rgba(0,0,0,1)),color-stop(28%,rgba(17,17,17,1)),color-stop(69%,rgba(43,43,43,1)),color-stop(100%,rgba(28,28,28,1)),color-stop(100%,rgba(19,19,19,1)) )}.Z-Code-Editor::-webkit-scrollbar-thumb:vertical{border:1px solid #090909;background:#333;border-radius:5px}.Z-Code-Editor{position:relative;width:100%;height:92%;padding:2% 0;background:#272822;color:#bbb;font:normal 14px/1.5 Consolas,Microsoft Yahei,黑体,宋体;word-break:break-all;overflow-y:scroll;-moz-user-select:none}.z-gutter-wrap{width:50px;min-height:100%;border-right:1px dashed #3b3c33;float:left}.z-gutter{text-align:right;color:#8f908a;cursor:default}.z-gutter li{padding-right:10px}.z-gutter .cur{background:#3e3d32}.z-content-wrap{position:relative;min-height:100%;margin-left:60px;cursor:text}.z-content{position:relative;z-index:999;min-height:400px;font-size:0}.z-content p{margin:0;padding:0;min-height:21px;font-size:14px}.z-content span{display:inline-block;vertical-align:top;letter-spacing:normal;word-spacing:normal}.z-textarea{position:absolute;left:20px;top:20px;z-index:1001;width:1px;height:20px;overflow:hidden;background:none;border:none;outline:none;resize:none;opacity:0}.z-cursor{position:absolute;left:-9999px;top:-9999px;z-index:1000;width:0;height:20px;border-left:2px solid #bbb}.z-selection{position:absolute;left:0;top:0;height:0;font-size:0;line-height:0;z-index:998;width:100%}.z-selection .selection{position:absolute;left:0;top:0;height:21px;background:#fff;opacity:0.2}</style>'
	};
	var self = this;
	var opt = this.opt = $.extend({}, _default, cfg);
	var editorWrap = $(opt.editorWrap);
	if(editorWrap.length != 1){
		alert('ERR, Please check the selector of your container!');
		return false;
	}
	!$('#ZCodeEditorCss').length && $('head').append(opt.baseStyle);
	editorWrap.append(opt.baseHtml);
	
	opt.editor = editorWrap.find('.Z-Code-Editor');
	opt.gutter = editorWrap.find('.z-gutter');
	opt.contentWrap = editorWrap.find('.z-content-wrap');
	opt.ta = editorWrap.find('.z-textarea');
	opt.cursor = editorWrap.find('.z-cursor');
	opt.tool = editorWrap.find('.z-tool');
	opt.cont = editorWrap.find('.z-content');
	opt.selection = editorWrap.find('.z-selection');
	
	opt.blink = setInterval(function(){
		self._setCursor();
	}, 500);
	opt.contentWrapOffset = {
		x: opt.contentWrap.offset().left,
		y: opt.contentWrap.offset().top + opt.editor.scrollTop()
	};
	this._setPosWhenClick();
	this._beforeFillWord();
	this._createSelection();
	this._copy();
	this._paste();
	this._preventDefault();
	//点击行号 选中当前行
	opt.gutter.on('click', 'li', function(){
		var _tar = $(this);
		var _index = _tar.index();
		opt.cont.find('p').removeAttr('cur');
		opt.cont.find('p').eq(_index).attr({'cur': 1, 'curIndex': 0});
		_tar.siblings().removeClass('cur');
		_tar.addClass('cur');
		//根据curIndex计算一下光标位置
		self._computePosBaseIndex();
		self._setCursorPos(opt.curPos);
		//停止光标闪烁
		self._fixCursorBlink();
	});
};

ZCodeEditor.prototype = {
	constructor: ZCodeEditor,
	//遍历
	each: function(tar, fn){
		if(tar.constructor === Object){
			for(var i in tar){
				fn(tar[i], i);
			}
		}
		else{
			var len = tar.length;
			for(var i=0;i<len;i++){
				fn(tar[i], i);
			}
		}
	},
	//获得浏览器类型
	navigat: function(){
		var user = window.navigator.userAgent;
		if(user.toLowerCase().indexOf("chrome") > 0){
			return "chrome";
		}
		else if(user.toLowerCase().indexOf("firefox") > 0){
			return "firefox";
		}
	},
	//创建独一的uid
	_createUnique: function(){
		var self = this;
		var uid = Math.floor(19999+Math.random()*29999).toString(16);
		//保证uid唯一性
		self.each(self.opt.pArr, function(n){
			while(n === uid){
				uid = Math.floor(19999+Math.random()*29999).toString(16);
			}
		});
		return uid;
	},
	//进行删除行的操作后 重置pArr
	_resetPArr: function(){
		var opt = this.opt;
		opt.pArr = [];
		opt.cont.find('p').each(function(){
			opt.pArr.push($(this).attr('name'));
		});
	},
	//模拟光标
	_setCursor: function(){
		var opt = this.opt;
		opt.opacity = (opt.opacity === 1) ? 0 : 1;
		opt.cursor.css('opacity', opt.opacity);
	},
	//连续操作下，停止光标闪烁
	_fixCursorBlink: function(){
		var self = this;
		var opt = self.opt;
		opt.cursor.css('opacity', 1);
		clearInterval(opt.blink);
		opt.blink = setInterval(function(){
			self._setCursor();
		}, 500);
	},
	//根据参数定位光标
	_setCursorPos: function(pos){
		var opt = this.opt;
		opt.cursor.css({
			left: pos.x + 'px',
			top: pos.y + 'px'
		});
		opt.ta.css({
			left: pos.x + 'px',
			top: pos.y + 'px'
		}).focus();
	},
	//点击的时候计算光标坐标(包括各种点击各种处理)
	_setPosWhenClick: function(){
		var self = this;
		var opt = this.opt;
		var cont = opt.cont;
		var cursor = opt.cursor;
		var ta = opt.ta;
		//设置点击在文本区光标位置
		cont.mousedown(function(ev){
			var $el = $(this);
			//将当前的编辑器设为焦点
			$('.z-content').removeAttr('focus');
			$el.attr('focus', 'on');
			//模拟事件，仅有click、focus、blur是原生的，其他模拟事件都是jq自己做的(很多属性没有，比如button)
			var button = 'button' in ev ? ev.button : 0;
			switch(button){
				//左键down
				case 0:
					//重置选区
					opt.selection.find('.selection').remove();
					$el.find('p').removeAttr('selectionStart selectionEnd');

					self._computePosBaseEvent($el, ev, function(){
						var _tar = $el.find('p[cur=1]');
						var _index = _tar.attr('curIndex');
						//记录选区开始坐标
						opt.isSelecting = true;
						opt.selectStartPos = {
							x: opt.curPos.x,
							y: opt.curPos.y
						};
						_tar.attr('selectionStart', _index);
					});
					break;
				//中键down
				case 1:
					//some action
					break;
				//右键down
				case 2:
					//模拟一个选区，让原生的右键菜单出现复制、剪切
					var ta = $('textarea');
					break;
				default:
					console.log('unCatched event');
			}
		});
		cont.mouseup(function(ev){
			var $el = $(this);
			var button = 'button' in ev ? ev.button : 0;
			switch(button){
				//左键up
				case 0:
					self._computePosBaseEvent($el, ev, function(){
						var _tar = $el.find('p[cur=1]');
						var _index = _tar.attr('curIndex');
						//记录选区结束坐标
						opt.isSelecting = false;
						opt.selectEndPos = {
							x: opt.curPos.x,
							y: opt.curPos.y
						};
						_tar.attr('selectionEnd', _index);
						//若z-selection中有子节点，则表示有选区
						if(opt.selection.children().length){
							opt.hasSelection = true;
						}
						else{
							opt.hasSelection = false;
						}
					});
					break;
				//中键up
				case 1:
					//some action
					break;
				//右键up
				case 2:
					break;
				default:
					console.log('unCatched event');
			}
		});
		//点击别的地方失焦
		ta.blur(function(){
			clearInterval(opt.blink);
			cursor.css('opacity', 0.6);
		});
		//修正点在光标上的时候出现的bug
		cursor.mousedown(function(ev){
			var _tar = cont.find('p[cur=1]');
			var _span = _tar.find('span');
			var _index = _tar.attr('curIndex');
			var _len = _span.length;
			if(_index < _len){
				_span.eq(_index).mousedown();
			}
			else{
				_tar.mousedown();
			}
		});
		ta.mousedown(function(ev){
			cursor.mousedown();
		});
		cursor.mouseup(function(ev){
			var _tar = cont.find('p[cur=1]');
			var _span = _tar.find('span');
			var _index = _tar.attr('curIndex');
			var _len = _span.length;
			if(_index < _len){
				_span.eq(_index).mouseup();
			}
			else{
				_tar.mouseup();
			}
		});
		ta.mouseup(function(ev){
			cursor.mouseup();
		});
	},
	/*根据event计算光标坐标
	 * @param obj 				绑定事件的对象 一般为opt.cont
	 * @param ev 				事件对象
	 * @param callback			计算完坐标后的回调（由于内部有延宕机制）
	 */
	_computePosBaseEvent: function(obj, ev, callback){
		var self = this;
		var opt = self.opt;
		var tar = obj;
		var _tar = $(ev.target);
		var tagName = ev.target.tagName.toLowerCase();
		//计算鼠标当前位置索引
		var curIndex = 0;
		var evPos = {
			x: ev.pageX - opt.contentWrapOffset.x,
			y: ev.pageY - opt.contentWrapOffset.y + opt.editor.scrollTop()
		};
		var uid = null;
		//若没有内容则创建p
		if(!opt.pArr.length){
			uid = self._createUnique();
			opt.pArr.push(uid);
			opt.cont.append('<p name="'+uid+'" cur=1 curIndex=0></p>');
			self._makeGutter();
		}
		//限制光标横向在文字中间 竖向在行中间
		if(tagName === 'span'){
			var tagSize = {
				x: parseInt(_tar.width()),
				y: parseInt(_tar.height())
			};
			var tagPos = {
				x: $(ev.target).offset().left - tar.offset().left,
				y: $(ev.target).offset().top - tar.offset().top
			};

			opt.cont.find('p').removeAttr('cur');
			//限制光标横向在文字中间
			if(evPos.x - tagPos.x > tagSize.x/2){
				//如果还有下一个
				if(_tar.next().length){
					curIndex = _tar.next().index();
				}
				//如果没有下一个
				else{
					curIndex = _tar.siblings().length + 1;
				}
			}
			else{
				curIndex = _tar.index();
			}
			//给p添加标记
			_tar.closest('p').attr({'cur': 1, 'curIndex': curIndex});
		}
		//设置点击在编辑器区域但非文本区域光标位置
		else if(tagName === 'p'){
			var _len = _tar.find('span').length;
			opt.cont.find('p').removeAttr('cur');
			_tar.attr({'cur': 1, 'curIndex': _len});
		}
		//设置点击在编辑器的文本区域下面的时候 将光标置于最后文本位置
		else if(tagName === 'div'){
			var _tarP = opt.cont.find('p').last();
			var _len = _tarP.find('span').length;
			opt.cont.find('p').removeAttr('cur');
			_tarP.attr({'cur': 1, 'curIndex': _len});
		}
		//需要延时 不然新创建的p拿不到
		setTimeout(function(){
			var _tarP = opt.cont.find('p[cur=1]');
			var _index = _tarP.attr('curIndex');

			self._fixCursorBlink();
			//根据curIndex计算一下光标位置
			self._computePosBaseIndex();
			self._setCursorPos(opt.curPos);
			//行号
			self._makeGutter();
			callback && callback();
		}, 0);
	},
	//根据p的curIndex计算光标坐标
	_computePosBaseIndex: function(){
		var opt = this.opt;
		var tarp = opt.cont.find('p[cur=1]');
		var tarspan = tarp.attr('curIndex') <= 0 ? null : tarp.find('span').eq(tarp.attr('curIndex') - 1);

		if(tarspan && tarspan.length){
			opt.curPos.x = tarspan.offset().left + tarspan.width() - opt.contentWrapOffset.x;
			opt.curPos.y = tarspan.offset().top - opt.contentWrapOffset.y + opt.editor.scrollTop();
		}else{
			opt.curPos.x = 0;
			opt.curPos.y = tarp.offset().top - opt.contentWrapOffset.y + opt.editor.scrollTop();
		}
	},
	//输入之前的检测和键盘控制and选区
	_beforeFillWord: function(){
		var type = 'ch';
		var auto = null;
		var self = this;
		var opt = this.opt;
		var uid = null;
		var cont = opt.cont;
		//火狐在keydown的时候 只在第一个键产生一个0的键码
		var ffCode = 0;
		//textarea
		opt.ta.keydown(function(ev){
			var code = ev.keyCode;
			var _tar = cont.find('p[cur=1]');
			var _index = parseInt(_tar.attr('curIndex'));
			//当前p的光标之后的所有span 用于在p内enter换行
			var _nextAll = [];
			//捕获到的向上的位置
			var _capturedUpIndex = null;
			//捕获到的向下的位置
			var _capturedDownIndex = null;
			//光标相对于当前p的偏移量 用于上下按键控制
			var _curPos = {
				x: opt.curPos.x,
				y: opt.curPos.y - opt.editor.scrollTop() + opt.contentWrapOffset.y - _tar.offset().top
			};
			//当前p的行高
			var _tarLineH = parseInt(_tar.css('line-height'));
			var _tarLeft = _tar.offset().left;
			var _tarTop = _tar.offset().top;
			//当前p的所有span
			var _tarspans = _tar.find('span');
			//应该将光标挪到的位置 相对于当前p
			var _tarPos = {x: 0, y: 0};

			ffCode = code;
			//按住ctrl键
			if(ev.ctrlKey){
				switch(code){
					//ctrl+c
					case 67:
						//复制选区
						if(opt.selection.find('.selection').width() > 0){
							//self._removeSelectionFile();
							//往后选
							if(opt.selectForward > 0){

							}
							//往前选
							else if(opt.selectForward < 0){

							}
						}
				}
			}
			else{
				switch(code){
					case 0:
					case 229:
						type = 'ch';
						clearTimeout(auto);
						auto = setTimeout(function(){
							//这里的操作，表示在中文输入法 按了enter键
							self._fillWord();
							//停止光标闪烁
							self._fixCursorBlink();
						}, 510);
						break;
					//删除
					case 8:
						//选区删除
						if(opt.selection.find('.selection').width() > 0){
							self._removeSelectionFile();
							return false;
						}

						type = 'en';
						//在行首删除
						if(_index === 0){
							if(_tar.prev().length === 0){
								//停止光标闪烁
								self._fixCursorBlink();
								return false;
							}
							else{
								var _tempStr = _tar.html();
								var __tar = _tar.prev();
								_tar.remove();
								__tar.attr({'cur': 1, 'curIndex': __tar.find('span').length});
								__tar.append(_tempStr);
							}
						}
						//在行中删除
						else{
							_tar.find('span').eq(_index - 1).remove();
							_index--;
							_tar.attr('curIndex', _index);
						}
						//历史记录
						self._history('true');

						break;
					//delete
					case 46:
						var _next = _tar.next();
						var _nextChildren = _next.find('span');
						var _str = '';
						//选区删除
						if(opt.selection.find('.selection').width() > 0){
							self._removeSelectionFile();
							return false;
						}
						//该行光标后面还有内容 则直接删除
						if(_index < _tar.find('span').length){
							_tar.find('span').eq(_index).remove();
						}
						//没有则将下一行合并过来
						else{
							if(_next.length > 0){
								_nextChildren.each(function(){
									var _tarSpan = $(this);
									_str += _tarSpan[0] ? _tarSpan[0].outerHTML : '';
								});
								_next.remove();
								_tar.append(_str);
							}
							else{
								return false;
							}
						}
						//历史记录
						self._history('true');

						break;
					//enter
					case 13:
						var _str = '';
						var _tarNext = null;
						type = 'en';
						//选区删除
						if(opt.selection.find('.selection').width() > 0){
							self._removeSelectionFile();
							//重新获取当前对象
							_tar = cont.find('p[cur=1]');
							//重新获取当前index
							_index = parseInt(_tar.attr('curIndex'));
						}
						
						uid = self._createUnique();
						opt.pArr.push(uid);
						_tarNext = $('<p name="'+uid+'" cur=1 curIndex=0></p>');
						_tarNext.insertAfter(_tar);
						_tar.removeAttr('cur');
						//不在行首enter
						if(_index > 0){
							_nextAll = _tar.find('span').eq(_index - 1).nextAll();
							_nextAll.each(function(){
								var _tarSpan = $(this);
								_str += _tarSpan[0] ? _tarSpan[0].outerHTML : '';
							});
							_nextAll.remove();
						}
						else{
							_str = _tar.html();
							_tar.html('');
						}
						_tarNext.append(_str);
						//根据curIndex计算一下光标位置
						self._computePosBaseIndex();
						self._setCursorPos(opt.curPos);
						//停止光标闪烁
						self._fixCursorBlink();
						//行号
						self._makeGutter();
						//高度增加
						self._dealScroll();
						//历史记录
						self._history('true');

						return false;
						break;
					//空格
					case 32:
						var str = '<span type="en">&nbsp;</span>';
						type = 'en';
						//选区删除
						if(opt.selection.find('.selection').width() > 0){
							self._removeSelectionFile();
							//重新获取当前对象
							_tar = cont.find('p[cur=1]');
							//重新获取当前index
							_index = parseInt(_tar.attr('curIndex'));
						}

						if(_index > 0){
							$(str).insertAfter(_tar.children().eq(_index - 1));
						}
						else{
							_tar.prepend(str);
						}
						_index++;
						_tar.attr('curIndex', _index);
						//根据curIndex计算一下光标位置
						self._computePosBaseIndex();
						self._setCursorPos(opt.curPos);
						//停止光标闪烁
						self._fixCursorBlink();
						//行号
						self._makeGutter();
						//历史记录
						self._history('true');
						
						return false;
						break;
					//tab键
					case 9:
						var str = '<span type="en">&nbsp;</span><span type="en">&nbsp;</span><span type="en">&nbsp;</span><span type="en">&nbsp;</span>';
						type = 'en';
						//选区删除
						if(opt.selection.find('.selection').width() > 0){
							self._removeSelectionFile();
							//重新获取当前对象
							_tar = cont.find('p[cur=1]');
							//重新获取当前index
							_index = parseInt(_tar.attr('curIndex'));
						}
						
						if(_index > 0){
							$(str).insertAfter(_tar.children().eq(_index - 1));
						}
						else{
							_tar.prepend(str);
						}
						_index += 4;
						_tar.attr('curIndex', _index);
						//根据curIndex计算一下光标位置
						self._computePosBaseIndex();
						self._setCursorPos(opt.curPos);
						//停止光标闪烁
						self._fixCursorBlink();
						//行号
						self._makeGutter();
						//历史记录
						self._history('true');
						
						return false;
						break;
					//shift
					case 16:
						break;
					//ctrl
					case 17:
						break;
					//上
					case 38:
						//在第一段第一行
						if(opt.curPos.y === 0){
							return false;
						}
						//若光标在当前p的首行
						if(_curPos.y === 0){
							_tar.removeAttr('cur', 1);
							_tar = _tar.prev();
							_tarLeft = _tar.offset().left;
							_tarTop = _tar.offset().top;
							_tarspans = _tar.find('span');
							//应该将光标移动到的位置
							_tarPos = {
								x: _curPos.x,
								y: _tar.height() - parseInt(_tar.css('line-height'))
							};
						}
						else{
							_tarPos = {
								x: _curPos.x,
								y: _curPos.y - _tarLineH
							};
						}

						_tarspans.each(function(i){
							var _offsetLeft = $(this).offset().left;
							var _offsetTop = $(this).offset().top;
							if(
								Math.abs(_offsetLeft - _tarLeft - _tarPos.x) < $(this).width()
								&&
								_offsetTop - _tarTop === _tarPos.y
							){
								_capturedUpIndex = i;
							}
						});

						//纠错 由于行末最后一个位置 可能能容下一个单字节但不能容下双子节 导致..
						if(!_capturedUpIndex){
							_tarspans.each(function(i){
								var _offsetLeft = $(this).offset().left;
								var _offsetTop = $(this).offset().top;
								if(
									Math.abs(_offsetLeft - _tarLeft - _tarPos.x) < $(this).width()*2
									&&
									_offsetTop - _tarTop === _tarPos.y
								){
									_capturedUpIndex = i + 1;
								}
							});
						}

						_tar.attr({'cur': 1, 'curIndex': _capturedUpIndex || _tarspans.length});
						_capturedUpIndex = null;

						break;
					//下
					case 40:
						//光标在最后一段最后一行
						var last = cont.children().last();
						if(opt.curPos.y + _tarLineH >= last.height() + last.offset().top - opt.contentWrapOffset.y + opt.editor.scrollTop()){
							return false;
						}
						//光标在当前段落最后一行
						if(_curPos.y >= _tar.height() - _tarLineH){
							_tar.removeAttr('cur', 1);
							_tar = _tar.next();
							_tarLeft = _tar.offset().left;
							_tarTop = _tar.offset().top;
							_tarspans = _tar.find('span');
							//应该将光标移动到的位置
							_tarPos = {
								x: _curPos.x,
								y: 0
							};
						}
						else{
							_tarPos = {
								x: _curPos.x,
								y: _curPos.y + _tarLineH
							};
						}
						//捕获符合条件的span
						_tarspans.each(function(i){
							var _offsetLeft = $(this).offset().left;
							var _offsetTop = $(this).offset().top;
							if(
								Math.abs(_offsetLeft - _tarLeft - _tarPos.x) < $(this).width()
								&&
								_offsetTop - _tarTop === _tarPos.y
							){
								_capturedDownIndex = i;
							}
						});

						//纠错 由于行末最后一个位置 可能能容下一个单字节但不能容下双子节 导致..
						if(!_capturedDownIndex){
							_tarspans.each(function(i){
								var _offsetLeft = $(this).offset().left;
								var _offsetTop = $(this).offset().top;
								if(
									Math.abs(_offsetLeft - _tarLeft - _tarPos.x) < $(this).width()*2
									&&
									_offsetTop - _tarTop === _tarPos.y
								){
									_capturedDownIndex = i + 1;
								}
							});
						}
						_tar.attr({'cur': 1, 'curIndex': _capturedDownIndex || _tarspans.length});
						_capturedDownIndex = null;

						break;
					//左
					case 37:
						var _tarPrev = _tar.prev();
						if(_index > 0){
							_index--;
							_tar.attr('curIndex', _index);
						}
						else{
							if(_tarPrev.length > 0){
								_tar.removeAttr('cur');
								_tarPrev.attr({'cur': 1, 'curIndex': _tarPrev.find('span').length});
							}
							else{
								return false;
							}
						}
						break;
					//右
					case 39:
						var _tarNext = _tar.next();
						if(_index < _tar.find('span').length){
							_index++;
							_tar.attr('curIndex', _index);
						}
						else{
							if(_tarNext.length > 0){
								_tar.removeAttr('cur');
								_tarNext.attr({'cur': 1, 'curIndex': 0});
							}
							else{
								return false;
							}
						}
						break;
				};
			}
			
			//根据curIndex计算一下光标位置
			self._computePosBaseIndex();
			self._setCursorPos(opt.curPos);
			//停止光标闪烁
			self._fixCursorBlink();
			//行号
			self._makeGutter();
			//高度增加
			self._dealScroll();
		});
		opt.ta.keypress(function(){
			type = 'en';
			setTimeout(function(){
				//正常的英文输入
				self._fillWord();
			}, 0);
		});
		opt.ta.keyup(function(ev){
			var code = ev.keyCode;
			//中文输入法下，按enter只能捕获keydown
			if(
				(type === 'ch' || ffCode === 0) &&
				(code === 32 || (code > 47 && code < 58) || (code > 185 && code < 193) || (code > 218 && code < 223))
			){
				//正常的中文输入
				self._fillWord();
			}
			//中文输入法下输入英文的操作(shift enter)
			if((type === 'ch' || ffCode === 0) && code != 13 && code != 16){
				clearTimeout(auto);
			}
			//停止光标闪烁
			self._fixCursorBlink();
		});
	},
	//将内容输入到content
	_fillWord: function(){
		var self = this;
		var opt = self.opt;
		var cont = opt.cont;
		var ta = opt.ta;
		var val = ta.val();
		var str = '';
		var reg = /[\u0100-\uFFFF]/;

		this.each(val, function(word, i){
			str += ('<span type="'+ (reg.test(word) ? 'd' : 's') +'">' + word + '</span>');
		});

		var len = $(str).length;
		//选区删除
		if(opt.selection.find('.selection').width() > 0){
			self._removeSelectionFile();
		}

		var _tar = cont.find('p[cur=1]');
		var _index = parseInt(_tar.attr('curIndex'));
		if(_index === 0){
			_tar.prepend(str);
		}
		else{
			$(str).insertAfter(_tar.children().eq(_index - 1));
		}
		

		_tar.attr('curIndex', _index + len);
		ta.val('');
		//根据curIndex计算一下光标位置
		self._computePosBaseIndex();
		self._setCursorPos(opt.curPos);
		//高度增加
		self._dealScroll();
		//历史记录
		self._history('true');		
	},
	//行号
	_makeGutter: function(){
		var self = this;
		var opt = self.opt;
		//段落
		var pArr = opt.cont.find('p');
		var pArrLen = pArr.length;
		var gutter = opt.gutter;
		var gutters = gutter.find('li');
		var guttersLen = gutters.length;
		if(gutters.length < pArrLen){
			gutter.append('<li>'+pArrLen+'</li>');
		}
		else if(guttersLen > pArrLen){
			for(var i=pArrLen;i<guttersLen;i++){
				gutters.eq(i).remove();
			}
		}

		setTimeout(function(){
			//当前p的索引
			var _tarPIndex = opt.cont.find('p[cur=1]').index();
			gutters = gutter.find('li');
			gutters.each(function(i){
				$(this).height(pArr.eq(i).height());
			});
			//重置p的name数组
			self._resetPArr();
			gutters.removeClass('cur');
			gutters.eq(_tarPIndex).addClass('cur');
		}, 0);
	},
	//可能遮盖光标时的视图位置调整
	_dealScroll: function(){
		var opt = this.opt;
		var _tarLineH = parseInt(opt.cont.find('p[cur=1]').css('line-height'));
		if(opt.curPos.y - opt.editor.scrollTop() > opt.editor.height() - _tarLineH){
			opt.editor.scrollTop(opt.editor.scrollTop() + _tarLineH);
		}
		else if(opt.curPos.y - opt.editor.scrollTop() < 0){
			opt.editor.scrollTop(opt.editor.scrollTop() - _tarLineH);
		}
	},
	//根据坐标模拟选区
	_createSelection: function(){
		var self = this;
		var opt = this.opt;
		var selection = opt.selection;
		var lines = 0;
		var lineH = 21;
		opt.cont.mousemove(function(ev){
			if(!opt.isSelecting){
				return false;
			}

			self._computePosBaseEvent($(this), ev, function(obj){
				//记录选区移动过程坐标
				opt.selectRuningPos = {
					x: opt.curPos.x,
					y: opt.curPos.y
				};
				//计算行数
				lines = Math.ceil(Math.abs(opt.selectRuningPos.y - opt.selectStartPos.y)/lineH) + 1;
				for(var i=0;i<lines;i++){
					if(!selection.find('.selection' + i).length){
						selection.append('<div class="selection selection' + i + '"></div>');
					}
				}
				var selectionArr = selection.find('.selection');
				selectionArr.each(function(index, elem){
					var _tar = $(elem);
					var _startY = opt.selectStartPos.y;
					if(index+1 > lines){
						_tar.remove();
					}
					//往后选
					if(opt.selectRuningPos.y > opt.selectStartPos.y ||
						(opt.selectRuningPos.y === opt.selectStartPos.y &&
						opt.selectRuningPos.x > opt.selectStartPos.x)){

						opt.selectForward = 1;
						_tar.css('top', index*lineH + _startY + 'px');
						//选区只有一行
						if(lines === 1){
							_tar.css({
								left: opt.selectStartPos.x + 'px',
								width: opt.selectRuningPos.x - opt.selectStartPos.x + 'px'
							});
						}
						//选区有多行
						else{
							switch(index){
								//首行
								case 0:
									var _nowLeft = opt.selectStartPos.x;
									_tar.css({
										left: _nowLeft + 'px',
										width: opt.cont.width() - _nowLeft + 'px'
									});
									break;
								//末行
								case lines - 1:
									var _nowLeft = opt.selectRuningPos.x;
									_tar.css({
										left: 0,
										width: _nowLeft + 'px'
									});
									break;
								//中间
								default:
									_tar.css({
										left: 0,
										width: opt.cont.width() + 'px'
									});
							}
						}
					}
					//往前选
					else{
						opt.selectForward = -1;
						_tar.css('top', _startY - index*lineH + 'px');
						//选区只有一行
						if(lines === 1){
							_tar.css({
								left: opt.selectRuningPos.x + 'px',
								width: opt.selectStartPos.x - opt.selectRuningPos.x + 'px'
							});
						}
						//选区有多行
						else{
							switch(index){
								//首行
								case lines - 1:
									var _nowLeft = opt.selectRuningPos.x;
									_tar.css({
										left: _nowLeft + 'px',
										width: opt.cont.width() - _nowLeft + 'px'
									});
									break;
								//末行
								case 0:
									var _nowLeft = opt.selectStartPos.x;
									_tar.css({
										left: 0,
										width: _nowLeft + 'px'
									});
									break;
								//中间
								default:
									_tar.css({
										left: 0,
										width: opt.cont.width() + 'px'
									});
							}
						}
					}
				});

				//更新选区
			});
		});
		$(document).mouseup(function(){
			opt.isSelecting = false;
		});
	},
	//有选区的情况下 输入操作的时候删除选区内容
	_removeSelectionFile: function(){
		var self = this;
		var opt = self.opt;
		var cont = opt.cont;
		var _startP = cont.find('p[selectionStart]');
		var _endP = cont.find('p[selectionEnd]');
		var _startPIndex = _startP.index();
		var _endPIndex = _endP.index();
		var _startSpanIndex = parseInt(_startP.attr('selectionStart'));
		var _endSpanIndex = parseInt(_endP.attr('selectionEnd'));
		var _ps = cont.find('p');
		//无选区的时候
		if(_startPIndex === _endPIndex && _startSpanIndex === _endSpanIndex){
			cont.find('p').removeAttr('selectionStart selectionEnd');
			opt.selection.html('');
			return false;
		}
		//有选区
		//往后选
		if(opt.selectForward === 1){
			var _spans = _startP.find('span');
			//在同一段落
			if(_startPIndex === _endPIndex){
				for(var i=_startSpanIndex;i<_endSpanIndex;i++){
					_spans.eq(i).remove();
				}
				_startP.attr('curIndex', _startSpanIndex);
			}
			//跨段
			else{
				var _startPSpan = _startP.find('span');
				var _startPSpanLen = _startPSpan.length;
				var _endPSpan = _endP.find('span');
				var _endPSpanLen = _endPSpan.length;
				//首段
				for(var i=_startSpanIndex;i<_startPSpanLen;i++){
					_spans.eq(i).remove();
				}
				//中间段
				for(var i=_startPIndex+1;i<_endPIndex;i++){
					_ps.eq(i).remove();
				}
				//末段
				for(var i=_endSpanIndex;i<_endPSpanLen;i++){
					_startP.append(_endPSpan.eq(i));
				}
				_endP.remove();
				_startP.attr({'cur': 1, 'curIndex': _startSpanIndex});
				//行号
				self._makeGutter();
			}
		}
		//往前选
		else{
			var _spans = _endP.find('span');
			//在同一段落
			if(_startPIndex === _endPIndex){
				for(var i=_endSpanIndex;i<_startSpanIndex;i++){
					_spans.eq(i).remove();
				}
				_endP.attr('curIndex', _endSpanIndex);
			}
			//跨段
			else{
				var _startPSpan = _startP.find('span');
				var _startPSpanLen = _startPSpan.length;
				var _endPSpan = _endP.find('span');
				var _endPSpanLen = _endPSpan.length;
				//首段
				for(var i=_endSpanIndex;i<_endPSpanLen;i++){
					_spans.eq(i).remove();
				}
				//中间段
				for(var i=_endPIndex+1;i<_startPIndex;i++){
					_ps.eq(i).remove();
				}
				//末段
				for(var i=_startSpanIndex;i<_startPSpanLen;i++){
					_endP.append(_startPSpan.eq(i));
				}
				_startP.remove();
				_endP.attr({'cur': 1, 'curIndex': _endSpanIndex});
				//行号
				self._makeGutter();
			}
		}
		//根据curIndex计算一下光标位置
		self._computePosBaseIndex();
		self._setCursorPos(opt.curPos);
		//停止光标闪烁
		self._fixCursorBlink();
		//重置选区
		cont.find('p').removeAttr('selectionStart selectionEnd');
		opt.selection.html('');
	},
	//复制
	_copy: function(){
		var self = this;
		var opt = this.opt;
		$('body').off('copy').on('copy', function(){
			/*if(!opt.hasSelection){
				return false;
			}*/
			alert('aaa');
		});
	},
	//粘贴
	_paste: function(){

	},
	/* 历史记录
	 * @param save 存历史记录
	 * @param read 取历史记录
	 */
	_history: function(save, read){
		/*var opt = self.opt;
		var cont = opt.cont;
		var historyStep = opt.historyStep;
		var historyCursor = opt.historyCursor;
		var historyArr = opt.historyArr;
		var historyArrLen = historyArr.length;
		//从游标位置 重新存入记录
		if(save && historyCursor > -1 && historyCursor < historyStep - 1){
			self.historyArr.length =  historyCursor + 1;
		}

		if(historyArrLen <= historyStep){
			if(save){
				console.log(cont.html());
				historyArr.push(cont.html());
				historyCursor = historyArrLen - 1;
			}
			if(read && historyCursor > -1){
				cont.html(historyArr[historyCursor]);
				historyCursor--;
				console.log(91);
			}
		}
		else{
			if(save){
				historyArr[0].remove();
				historyArr.push(cont.html());
			}
			if(read && historyCursor > -1){
				cont.html(historyArr[historyCursor]);
				historyCursor--;
				console.log(91);
			}
		}
		//根据curIndex计算一下光标位置
		self._computePosBaseIndex();
		self._setCursorPos(opt.curPos);
		//高度增加
		self._dealScroll();*/
	},
	//阻止浏览器默认行为
	_preventDefault: function(){
		var preventTar = $(this.opt.editor);
		preventTar.each(function(){
			this.onselect = function(){
			return false;
			};
			this.ondragstart = function(){
				return false;
			};
			this.onselectstart = function(){
				return false;
			};
		});
	}
};