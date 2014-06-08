/**
 * @file 树形选择器；
 * 支持传入扁平数据或者层级数据
 * 支持对数据集的适配
 * 支持异步加载或者全集加载
 * 支持自动对截断的文本进行title提示
 * @author：张少龙（zhangshaolong@baidu.com）
 */
var Tree = (function() {
    var DEFAULT_MAP_KEYS = {
        pid: 'pid',
        id : 'id',
        text : 'text',
        isLeaf : 'isLeaf',
        child : 'child'
    };
    /**
     * 属性适配器，针对前后端数据字段不一致的时候转换处理
     * @private
     * @param {?obejct} mapKeys 有冲突的属性适配关系对象
     * @param {Tree} treeInstance 当前Tree实例
     * @method
     * @return
     */
    var setMapKeys = function (mapKeys, treeInstance) {
        var keys = treeInstance.mapKeys = {};
        for (var key in DEFAULT_MAP_KEYS) {
            keys[key] = (mapKeys && mapKeys[key])
                || DEFAULT_MAP_KEYS[key];
        }
    };
    /**
     * 把数组转换成map存储，方便索引
     * @private
     * @param {Array.<string>} arr 
     * @method
     * @return {object} key=value的map
     */
    var array2Map = function (arr) {
        var map = {};
        for (var i=0,len=arr.length; i<len; i++) {
            map[arr[i]] = arr[i];
        }
        return map;
    };
    /**
     * 是否扁平数据集
     * @private
     * @param {Array.<obejct>} data 数据集
     * @param {string} pidKey 父id的属性字段
     * @param {string} childKey 下级数据的属性字段
     * @method
     * @return {boolean}
     */
    var isFlatData = function (data, pidKey, childKey) {
        return data[childKey] === undefined || data[pidKey];
    };
    /**
     * 是否层级数据集
     * @private
     * @param {Array.<obejct>} data 数据集
     * @param {string} pidKey 父id的属性字段
     * @param {string} childKey 下级数据的属性字段
     * @method
     * @return {boolean}
     */
    var isLevelData = function (data, pidKey, levelKey) {
        return data[levelKey] !== undefined && data[pidKey] === undefined;
    };
    /**
     * 层级数据集解析
     * @private
     * @param {Array.<obejct>} data 数据集
     * @param {Tree} treeInstance 当前Tree实例
     * @param {string} pid 父id
     * @param {Array.<string>} child4pid pid的下级ID数据的集合
     * @method
     * @return
     */
    var levelDataProcess = function (data, treeInstance, pid, child4pid) {
        var idKey = treeInstance.mapKeys.id;
        var pidKey = treeInstance.mapKeys.pid;
        var childKey = treeInstance.mapKeys.child;
        var indexData = treeInstance.indexData
            || (treeInstance.indexData = {});
        var indexRelation = treeInstance.indexRelation
            || (treeInstance.indexRelation = {});
        pid = pid === undefined ? null : pid;
        // 添加第一级数据关系，即把pid为null的数据放入到key为'null'的字段上
        if (null === pid) {
            var relationMap = indexRelation['null'] = {};
            child4pid = relationMap[childKey] = [];
        }
        for (var i=0,len=data.length; i<len; i++) {
            var model = data[i];
            var id = model[idKey];
            child4pid && child4pid.push(id);
            var childs = model[childKey];
            var relationMap = indexRelation[id] = {};
            var indexRegionMap = indexData[id] = {};
            for (var key in model) {
                if (childKey !== key && pidKey !== key) {
                    indexRegionMap[key] = model[key];
                }
            }
            relationMap[pidKey] = pid;
            if (childs) {
                var child4id = relationMap[childKey] = [];
                levelDataProcess(childs, treeInstance, id, child4id);
            }
        }
    };
    /**
     * 扁平数据集解析
     * @private
     * @param {Array.<obejct>} data 数据集
     * @param {Tree} treeInstance 当前Tree实例
     * @method
     * @return
     */
    var flatDataProcess = function (data, treeInstance) {
        var idKey = treeInstance.mapKeys.id;
        var pidKey = treeInstance.mapKeys.pid;
        var childKey = treeInstance.mapKeys.child;
        var indexData = treeInstance.indexData
            || (treeInstance.indexData = {});
        var indexRelation = treeInstance.indexRelation
            || (treeInstance.indexRelation = {});
        for (var i=0,len=data.length; i<len; i++) {
            var model = data[i];
            var id = model[idKey];
            var pid = model[pidKey];
            var relationMap = indexRelation[id] = {};
            var indexRegionMap = indexData[id] = {};
            for (var key in model) {
                if (childKey !== key && pidKey !== key) {
                    indexRegionMap[key] = model[key];
                }
            }
            relationMap[pidKey] = pid;
            var pidMap = indexRelation[pid];
            if (!pidMap) {
                pidMap = indexRelation[pid] = {};
            }
            var pChilds = pidMap[childKey];
            if (!pChilds) {
                pChilds = pidMap[childKey] = [];
            }
            pChilds.push(id);
        }
    };
    /**
     * 创建单层数据节点元素
     * @private
     * @param {Array.<string>} 节点id集合
     * @param {dom} 节点id集合的容器
     * @param {Tree} treeInstance 当前Tree实例
     * @method
     * @return
     */
    var createBranchNodes = function (ids, ul, treeInstance) {
        var isRoot = ul.hasClass('tree');
        var indexData = treeInstance.indexData;
        var indexRelation = treeInstance.indexRelation;
        for (var i=0,len=ids.length; i<len; i++) {
            var id = ids[i];
            var model = indexData[id];
            var isLeaf = model.isLeaf;
            var li = $('<li>');
            var checkbox = $('<button>').val(id);
            checkbox.addClass('checkbox unchecked');
            treeInstance.indexCheckbox[id] = checkbox;
            var switchBtn = $('<button>');
            switchBtn.addClass('switch');
            var text = $('<a>');
            text.attr('href', 'javascript:void(0)');
            text.text(model[treeInstance.mapKeys.text]);
            var position = '';
            var type = '';
            if (isLeaf) {
                type = 'line';
            } else {
                type = 'close';
            }
            if (i == len - 1) {
                position = 'bottom';
            } else {
                position = 'center';
            }
            if (isRoot) {
                if (len === 1) {
                    position = 'root';
                } else if (i === 0) {
                    position = 'top';
                }
            }
            switchBtn.addClass(position + '-' + type);
            li.append(checkbox).append(switchBtn).append(text);
            ul.append(li);
            var childContainer = $('<ul>');
            childContainer.addClass('hide');
            if (!this.isUnfolded) {
            }
            if (len !== i + 1) {
                childContainer.addClass('line');
                //!this.isView && _addClass(nextLevel, 'line');
            }
            li.append(childContainer);
            var childs = indexRelation[id][treeInstance.mapKeys.child];
            if (childs) {
                createBranchNodes(childs, childContainer, treeInstance);
            }
            checkbox.click(function (childContainer) {
                return function () {
                    checkboxHandler($(this), treeInstance);
                };
            }(childContainer));
            switchBtn.click(function (childContainer) {
                return function () {
                    switchHandler($(this), childContainer, treeInstance);
                }
            }(childContainer));
        }
    };
    /**
     * 多选框事件处理
     * @private
     * @param {jdom} checkbox 点击的多选框元素
     * @param {Tree} treeInstance 当前Tree实例
     * @method
     * @return
     */
    var checkboxHandler = function (checkbox, treeInstance) {
        var state = checkbox.hasClass('checked') ? 'unchecked' : 'checked';
        toggleState(checkbox.val(), state, treeInstance);
    };
    /**
     * 开关树枝事件处理
     * @private
     * @param {jdom} switchBtn 点击的开关元素
     * @param {jdom} childContainer 展开的下级节点容器
     * @param {Tree} treeInstance 当前Tree实例
     * @method
     * @return
     */
    var switchHandler = function (switchBtn, childContainer, treeInstance) {
        if (treeInstance.async && !childContainer.prop('hasData')) {
            switchBtn.addClass('loading');
            var id = switchBtn.prev().val();
            var param = treeInstance.param;
            param.id = id;
            $.ajax({
                url : treeInstance.datasource,
                type : 'POST',
                data : param,
                dataType : 'json',
                cache : false,
                success : function(data) {
                    data = eval('(' + data + ')');
                    console.log(childContainer)
                    treeInstance.branch(data, id, childContainer);
                    switchBtn.removeClass('loading');
                    childContainer.addClass('line');
                    childContainer.prop('hasData', true);
                    childContainer.removeClass('hide');
                    switchBtn[0].className = switchBtn[0].className
                        .replace('-close', '-open');
                    if (treeInstance.success) {
                        treeInstance.success.apply(treeInstance, arguments);
                    }
                }
            });
        } else {
            var className = switchBtn[0].className;
            if (className.indexOf('-close') > -1) {
                childContainer.removeClass('hide');
                switchBtn[0].className = className.replace('-close', '-open');
            } else {
                childContainer.addClass('hide');
                switchBtn[0].className = className.replace('-open', '-close');
            }
        }
    };
    /**
     * 设置点击的checkbox下面的子级状态
     * @private
     * @param {dom} checkbox 点击的checkbox
     * @param {string} state 点击某个checkbox后，它的状态
     * @return
     */
    var toggleChilds = function (id, state, treeInstance) {
        var pidKey = treeInstance.mapKeys.pid;
        var childKey = treeInstance.mapKeys.child;
        var indexCheckbox = treeInstance.indexCheckbox;
        var indexRelation = treeInstance.indexRelation;
        var childs = indexRelation[id][childKey];
        indexCheckbox[id].removeClass().addClass('checkbox ' + state);
        if (childs) {
            for (var i=0,len=childs.length; i<len; i++) {
                toggleChilds(childs[i],
                    state, treeInstance);
            }
        }
    };
    /**
     * 设置点击的checkbox所有父级状态
     * @private
     * @param {dom} checkbox 点击的checkbox
     * @param {string} state 点击某个checkbox后，它的状态
     * @return
     */
    var toggleParents = function (id, state, treeInstance) {
        var pidKey = treeInstance.mapKeys.pid;
        var childKey = treeInstance.mapKeys.child;
        var indexCheckbox = treeInstance.indexCheckbox;
        var indexRelation = treeInstance.indexRelation;
        var childs = indexRelation[id][childKey];
        
        var pid = indexRelation[id][pidKey];
        if (pid) {
            var siblings = indexRelation[pid][childKey];
            var isHalf = false;
            for (var i=0,len=siblings.length; i<len; i++) {
                if (!indexCheckbox[siblings[i]].hasClass(state)) {
                    isHalf = true;
                    break;
                }
            }
            var pCheckbox = indexCheckbox[pid];
            if (isHalf) {
                pCheckbox.removeClass().addClass('checkbox halfchecked');
                state = 'halfchecked';
            } else {
                pCheckbox.removeClass().addClass('checkbox ' + state);
            }
            toggleParents(pid, state, treeInstance);
        }
    };
    /**
     * 设置和点击的checkbox相关的其他checkbox的状态
     * @private
     * @param {dom} checkbox 点击的checkbox
     * @return
     */
    var toggleState = function (id, state, treeInstance) {
        toggleChilds(id, state, treeInstance);
        toggleParents(id, state, treeInstance);
    };
    var Tree = function(option) {
        this.container = $(option.container);
        this.container.addClass('tree');
        this.indexCheckbox = {};
        setMapKeys(option.mapKeys, this);
        
        this.checkAble = (option.checkAble === false) ? false : true;
        this.isUnfolded = option.isUnfolded;
        this.visible = (option.visible === false) ? false : true;
        this.async = option.async;
        this.datasource = option.datasource;
        this.param = option.param || {};
    };
    /**
     * 树枝加载器，若传递的是多层数据，可一起解析完成
     * 
     */
    Tree.prototype.branch = function (data, pid, ul) {
        this.analysisData(data, pid);
        if (pid === undefined || pid === null) {
            var ul = $('<ul>');
            pid = 'null';
            ul.addClass('tree');
            var container = this.container;
        } else {
            var container = this.indexCheckbox[pid].parent();
        }
        container.append(ul);
        var childIds = this.indexRelation[pid][this.mapKeys.child];
        if (childIds) {
            createBranchNodes(childIds, ul, this);
        }
    };
    
    Tree.prototype.load = function (data, vals) {
        this.branch(data);
    };
    /**
     * 解析原始数据并进行对应的索引建立
     * @public
     * @param {Array.<object>} data 数据集
     * @param {?string} pid 层级ID，当有pid参数时，data为pid的下级数据
     */
    Tree.prototype.analysisData = function (data, pid) {
        var pidKey = this.mapKeys.pid;
        var childKey = this.mapKeys.child;
        if (pid) {
            var child4pid = this.indexRelation[pid][childKey] = [];
        }
        if (isLevelData(data[0], pidKey, childKey)) {
            levelDataProcess(data, this, pid, child4pid);
        } else if(isFlatData(data[0], pidKey, childKey)){
            flatDataProcess(data, this);
        }
    };
    /**
     * 获取选中的ID数组
     * @public
     * @return {Array.<string>} 返回所有选中的地域值
     */
    Tree.prototype.getVal = function () {
        var results = [];
        for (var id in this.indexCheckbox) {
            if ($(this.indexCheckbox[id]).hasClass('checked')) {
                results.push(id);
            }
        };
        return results;
    };
    /**
     * 设置值
     * @public
     * @param {string|Array.<string>} 设置的ID数组
     */
    Tree.prototype.setVal = function (vals) {
        vals = [].concat(vals);
        var selectedIdMap = array2Map(vals);
        for (var id in this.indexCheckbox) {
            this.indexCheckbox[id].removeClass()
                .addClass('checkbox unchecked');
        }
        for (var id in selectedIdMap) {
            toggleState(id, 'checked', this);
        }
    };
    return Tree;
})();