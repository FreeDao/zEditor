var zEditor = {
	/* 富文本编辑器
	 * @param cfg.elem(string)			可编辑div的选择器
	 */
	init: function(cfg){
		var _default = {
			elem: ''
		};
		this.opt = $.extend({}, _default, cfg);
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
	createUnique: function(){
		var self = this;
		var uid = Math.floor(19999+Math.random()*29999).toString(16);
		//保证uid唯一性
		for(var i=0;i<self.arr.length;i++){
			while(self.arr[i] === uid){
				uid = Math.floor(19999+Math.random()*19999).toString(16);
				console.log("恭喜你，中彩票啦！概率为1/29999");
			}
		}
		return uid;
	},
	//设置可编辑div光标
	setCursor: function(){
		var self = this;
		var elem = this.opt.elem;
		self.arr = self.arr || [];
		$(elem).keydown(function(ev){
			var _range = document.getSelection && document.getSelection();
			var _parent = _range.getRangeAt(0).commonAncestorContainer;
			//当光标所在的位置为空文本时，其commonAncestorContainer为最外层可编辑div，不为空，才是文本节点
			var _tag = _parent.nodeType === 3 ? _parent.parentNode : _parent;
			var _tagName = _tag.tagName.toLowerCase();

			while(_tagName != "div" && _tagName != "p" && _tagName != "pre"){
				_tag = _tag.parentNode;
				_tagName = _tag.tagName.toLowerCase();
				//console.log(_tagName);
			};
			//如果光标在pre，则退出
			if(_tagName === "pre"){
				return;
			}
			//页面无内容时
			if($(this).text() === ""){
				self.arr.length = 0;
				if(ev.keyCode === 9){
					return false;
				}
				//按下回车，若仍设置html为""，则看上去像是不能按回车
				if(ev.keyCode != 13){
					$(this).html("");
				}
				//为每一个段落增加标记
				var uid = Math.floor(19999+Math.random()*29999).toString(16);
				var _p = $('<p name="'+ uid +'"><br></p>');
				_p.appendTo($(this));
				_range.collapse(_p.get(0), 0);
				_p.html("<br>");
				self.arr.push(uid);
			}
			//换行后，生成另外一个带有uid的p
			if(ev.keyCode === 13){
				var uid = self.createUnique();
				//段落生成UID
				setTimeout(function(){
					if(self.navigat() === "chrome"){
						$(_tag).next().attr("name", uid);
						//console.log($(_tag).next().html())
					}
					else if(self.navigat() === "firefox"){
						$(_tag).attr("name", uid);
					}
				}, 0);
				self.arr.push(uid);
			}
			//删除键控制
			else if(ev.keyCode === 8){
				if($(this).find("p").text() === "" && $(this).find("pre").text() === ""){
					return false;
				}
			}
		});
	},
	//插入代码模式
	insertCode: function(){
		var self = this;
		var elem = this.opt.elem;
		self.arr = self.arr || [];
		$(elem).keydown(function(ev){
			var _range = document.getSelection && document.getSelection();
			var _parent = _range.getRangeAt(0).commonAncestorContainer;
			//当光标所在的位置为空文本时，其commonAncestorContainer为最外层可编辑div，不为空，才是文本节点
			var _tag = _parent.nodeType === 3 ? _parent.parentNode : _parent;
			var _tagName = _tag.tagName.toLowerCase();

			while(_tagName != "div" && _tagName != "p" && _tagName != "pre" && _tagName != "li"){
				_tag = _tag.parentNode;
				_tagName = _tag.tagName.toLowerCase();
				//console.log(_tagName);
			};
			//触发插入代码(此处chrome中输入内容后<br>会自动消失，但ff不会，同时ff又不支持innerText...)
			if(ev.keyCode === 13 && _tag.textContent === 'code'){
				var uid = self.createUnique();
				var pre = $('<pre name='+ uid +'><ul><li> </li></ul></pre>');
				pre.insertBefore(_tag);
				self.arr.push(uid);
				//移动光标
				_range.collapse(pre[0], 0);
				_tag.remove();
				return false;
			}
			//pre中的按键控制
			if(_tagName === "pre" || _tagName === "li"){
				//tab缩进
				if(ev.keyCode === 9){
					var curIndex  = _range.baseOffset;
					var html = _tag.innerHTML;
					var prev = html.substr(0, curIndex);
					var next = html.substring(curIndex, html.length);
					_tag.innerHTML = prev + '    ' + next;
					_range.collapse(_tag, 1);
					return false;
				}
				//当前行内无内容 再次enter会跳出pre的li...所以在换行后 给重新生成的li一个空格
				else if(ev.keyCode === 13){
					var tar = $(_tag);
					if(tar.html() === "<br>"){
						return false;
					}
					setTimeout(function(){
						if(self.navigat() === "chrome" && $(_tag).next().html() === "<br>"){
							$(_tag).next().html(" ");
							//console.log($(_tag).next().html())
						}
						else if(self.navigat() === "firefox" && $(_tag).html() === "<br>"){
							$(_tag).html(" ");
						}
					}, 0);
				}
				//pre里面没内容时，按删除键，当删除了li时，应当把该pre也删除
				else if(ev.keyCode === 8){
					var tar = $(_tag).closest('pre');
					//由于创建pre时插入了一个空格，当pre中只剩这个空格，并且光标前面没有内容时，将不能删除这个pre，所有可编辑元素都有这个特性
					if(tar.text() === " "){
						tar.remove();
						//隐藏运行按钮
						$('.runcode').css('left', '-9999px');
					}
					//当pre中没有li时，应该立即删除pre，否则继续输入内容会出错
					setTimeout(function(){
						if(!tar.find('li').length){
							tar.remove();
							//隐藏运行按钮
							$('.runcode').css('left', '-9999px');
						}
					}, 0);
				}
			}
		});
		//在pre之后插入p (仅当鼠标点击非pre区，并且pre为最后一个子节点时插入)
		$(elem).click(function(ev){
			var last = $(this).children().last();
			if(last[0].tagName.toLowerCase() === "pre" && ev.target.tagName.toLowerCase() === 'div'){
				var _range = document.getSelection && document.getSelection();
				var uid = self.createUnique();
				var p = $('<p name='+ uid +'><br></p>');
				$(this).append(p);
				self.arr.push(uid);
				_range.collapse(p[0], 0);
			}
		});
	},
	//代码运行
	runcode: function(){
		var self = this;
		var elem = this.opt.elem;
		var btn = $('<div class="runcode"><button class="green run">运行</button></div>');
		btn.appendTo($('.post-tool'));
		//位置
		$('body').on('mouseenter', 'pre', function(ev){
			var pos = $(this).offset();
			var pre = $(this);
			//由于runcode按钮不在pre中，所以要对mouseenter和mouseleave事件进行处理
			if(ev.relatedTarget && ev.relatedTarget.textContent === "运行"){
				return false;
			}
			btn.css({
				'position': 'absolute',
				'left': pos.left + $(elem).width() - btn.width() + 'px',
				'top': pos.top + 10 + 'px'
			});

			//运行代码
			$('.runcode .run').unbind().click(function(){
				var code = pre.text();
				//区分是javascript代码还是html代码
				var htmlReg = /^\<!/;
				//html
				if(htmlReg.test(code)){
					var newWindow = window.open('', '', '');
					newWindow.opener = null 
		  			newWindow.document.write(code);  
		  			newWindow.document.close();
				}
				else{//javascript
					try{
						eval(code);
					}
					catch(e){
						console.log(e);
					}
				}
			});
		});

		$('body').on('mouseleave', 'pre', function(ev){
			//由于runcode按钮不在pre中，所以要对mouseenter和mouseleave事件进行处理
			if(ev.relatedTarget && ev.relatedTarget.textContent === "运行"){
				return false;
			}
			btn.css('left', '-9999px');
		});
	},
	/* 过滤粘贴html字符 */
	filterPaste: function(){
		var self = this;
		var elem = this.opt.elem;
		//注意paste事件兼容性
		$("body").on("paste", elem, function(ev){
			var tar = $(this);
			var arr = self.arr;
			var len = arr.length;
			//如果在pre中粘贴：
			if($(ev.target).closest('pre').length){
				return false;
			}
			//在p或div中粘贴
			setTimeout(function(){
				//去掉非p标签和style行间样式
				var reg = /<[^p\/][^>]*>+|<\/[^p][^>]*>+|\s*(style|id|class|name)\=\"[^\"]*\"+/ig;
				
				//页面无内容的时候，粘贴进不带p的内容的处理办法
				if( !$(elem + ">p").length ){
					var _html = $(elem).html();
					var _name = self.createUnique();
					self.arr.push(_name);
					_html = _html.replace(reg, "");
					_html = '<p name="' + _name + '">' + _html + '</p>';
					$(elem).html(_html);
				}

				//粘贴进div、ul这种p不能包裹的标签的解决办法
				var _allArr = $(elem).children();
				var _allArrLen = _allArr.length;
				for(var i=0;i<_allArrLen;i++){
					if(_allArr[i] && _allArr[i].tagName.toLowerCase() != "p"){
						var _after = _allArr.eq(i).prev();
						var shtml = _allArr[i].outerHTML;
						var _name = self.createUnique();
						self.arr.push(_name);
						shtml = shtml.replace(reg, "");
						shtml = '<p name="' + _name + '">' + shtml + '</p>';
						_allArr[i].remove();
						$(shtml).insertAfter(_after);
					}
				}

				//带有标记的p的个数
				var pArr = tar.find("p");
				var pArrLen = pArr.length;
				for(var i=0;i<pArrLen;i++){
					var flag = 0;
					for(var j=0;j<len;j++){
						if(pArr.eq(i).attr("name") === arr[j]){
							flag = 1;
							break;
						}
						else{
							flag = 0;
						}
					}
					if(!flag){
						var html = pArr.eq(i).html().replace(reg, "");
						pArr.eq(i).removeAttr("style");
						pArr.eq(i).html(html);
					}
				}

				var _arr = $(elem + ">p");
				var _arrLen = _arr.length;
				for(var i=0;i<_arrLen;i++){
					var _tar_ = _arr.eq(i);
					var _html_ = _tar_.html();
					//在已有name的段落粘贴
					if(_html_.indexOf('style="') > -1){
						_html_ = _html_.replace(reg, "");
						_tar_.html(_html_);
					}
					//给新添段落加name
					if(!_tar_.attr("name")){
						var _name_ = self.createUnique();
						self.arr.push(_name_);
						_tar_.attr("name", _name_);
					}
				}
				//防止由于在已有文字中间粘贴，导致非正常换行，产生相同name的段落的bug
				var _pArr = self.arr;
				var _pArrLen = _pArr.length;
				for(var i=0;i<_pArrLen;i++){
					var checkTar = $(elem + ">p[name="+_pArr[i]+"]");
					if(checkTar.length > 1){
						for(var j=1;j<checkTar.length;j++){
							var _name_ = self.createUnique();
							self.arr.push(_name_);
							checkTar.eq(j).attr("name", _name_);
						}
					}
				}

				/*//去掉空p
				var _allPara_ = $(elem + ">p");
				var _aPLen_ = _allPara_.length;
				for( var i=0;i<_aPLen_;i++ ){
					($.trim(_allPara_.eq(i).text()) === "") && _allPara_.eq(i).remove();
				}*/

			}, 0);
		});
	},
	//可编辑div根据内容自动伸长
	autoHeight: function(){
		var self = this;
		var arr = this.arr;
		var elem = this.opt.elem;
		var defaultH = $(elem).height();
		var ii = 0;
		//chrome的scrollTop是body的属性 FF的scrollTop是html的属性...奇葩
		var scrollTar = (self.navigat() == 'chrome') ? 'body' : 'html';
		$(elem).keyup(function(){
			var pArr = $(elem).children();
			var totalH = 0;
			pArr.each(function(i){
				var height = pArr.eq(i).outerHeight(true);
				totalH += height;
			});
			//自动加高，并控制滚动条的位置
			if(defaultH - totalH < 100){
				var _initH = defaultH;
				ii++;
				defaultH = totalH + 320;
				$(elem).animate({'height': defaultH + 'px'}, 200);
				$(scrollTar).animate({'scrollTop':  (defaultH - _initH)*ii + 'px'}, 200);
			}
			//自动缩短
			if(defaultH - totalH > 320){
				var tar = Math.max(totalH + 100, 320);
				$(elem).animate({'height': tar + 'px'}, 200, function(){
					defaultH = $(elem).height();
				});
			}
		});
	},
	//代码高亮
	highLight: function(){
		var reg = /\sfunction\s/ig;
		var self = this;
		var elem = this.opt.elem;
		self.arr = self.arr || [];
		$(elem).keydown(function(ev){
			var _range = document.getSelection && document.getSelection();
			var _parent = _range.getRangeAt(0).commonAncestorContainer;
			var _tag = _parent.nodeType === 3 ? _parent.parentNode : _parent;
			var _tagName = _tag.tagName.toLowerCase();
			var text = "";
			while(_tagName != "div" && _tagName != "p" && _tagName != "pre" && _tagName != "li"){
				_tag = _tag.parentNode;
				_tagName = _tag.tagName.toLowerCase();
				//console.log(_tagName);
			};
			if(_tagName != "li"){
				return;
			}
			text = _tag.textContent;
			if(reg.test(text)){

				var arr = text.split(reg);
				text = arr[0] + '<em>'+text.match(reg)[0]+'</em>' + arr[1];
				_tag.innerHTML = text;
			}
		});
	}
};