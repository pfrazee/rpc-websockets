/**
 * "Server" wraps the "uWebSockets/bindings" library providing JSON RPC 2.0 support on top.
 * @module Server
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _map = require("babel-runtime/core-js/map");

var _map2 = _interopRequireDefault(_map);

var _typeof2 = require("babel-runtime/helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _toConsumableArray2 = require("babel-runtime/helpers/toConsumableArray");

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require("babel-runtime/core-js/get-iterator");

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _getPrototypeOf = require("babel-runtime/core-js/object/get-prototype-of");

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require("babel-runtime/helpers/possibleConstructorReturn");

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require("babel-runtime/helpers/inherits");

var _inherits3 = _interopRequireDefault(_inherits2);

var _assertArgs = require("assert-args");

var _assertArgs2 = _interopRequireDefault(_assertArgs);

var _eventemitter = require("eventemitter3");

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _uws = require("uws");

var _uuid = require("uuid");

var _uuid2 = _interopRequireDefault(_uuid);

var _url = require("url");

var _url2 = _interopRequireDefault(_url);

var _circularJson = require("circular-json");

var _circularJson2 = _interopRequireDefault(_circularJson);

var _utils = require("./utils");

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Server = function (_EventEmitter) {
    (0, _inherits3.default)(Server, _EventEmitter);

    /**
     * Instantiate a Server class.
     * @constructor
     * @param {Object} options - ws constructor's parameters with rpc
     * @return {Server} - returns a new Server instance
     */
    function Server(options) {
        (0, _classCallCheck3.default)(this, Server);

        /**
         * Stores all connected sockets with a universally unique identifier
         * in the appropriate namespace.
         * Stores all rpc methods to specific namespaces. "/" by default.
         * Stores all events as keys and subscribed users in array as value
         * @private
         * @name namespaces
         * @param {Array} namespaces.rpc_methods
         * @param {Map} namespaces.clients
         * @param {Object} namespaces.events
         */
        var _this = (0, _possibleConstructorReturn3.default)(this, (Server.__proto__ || (0, _getPrototypeOf2.default)(Server)).call(this));

        _this.namespaces = {};

        _this.wss = new _uws.Server(options, function () {
            return _this.emit("listening");
        });

        _this.wss.on("connection", function (socket) {
            var ns = _url2.default.parse(socket.upgradeReq.url).pathname;
            socket._id = _uuid2.default.v1();

            // cleanup after the socket gets disconnected
            socket.on("close", function () {
                _this.namespaces[ns].clients.delete(socket._id);

                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = (0, _getIterator3.default)((0, _keys2.default)(_this.namespaces[ns].events)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var event = _step.value;

                        var index = _this.namespaces[ns].events[event].indexOf(socket._id);

                        if (index === 0) _this.namespaces[ns].events[event].splice(index, 1);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            });

            if (!_this.namespaces[ns]) _this._generateNamespace(ns);

            // store socket and method
            _this.namespaces[ns].clients.set(socket._id, socket);
            _this.namespaces[ns].rpc_methods.push(socket._id);

            return _this._handleRPC(socket, ns);
        });

        _this.wss.on("error", function (error) {
            return _this.emit("error", error);
        });
        return _this;
    }

    /**
     * Registers an RPC method.
     * @method
     * @param {String} name - method name
     * @param {Function} fn - a callee function
     * @param {String} ns - namespace identifier
     * @throws {TypeError}
     * @return {Undefined}
     */


    (0, _createClass3.default)(Server, [{
        key: "register",
        value: function register(name, fn) {
            var ns = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "/";

            (0, _assertArgs2.default)(arguments, {
                name: "string",
                fn: "function",
                "[ns]": "string"
            });

            if (!this.namespaces[ns]) this._generateNamespace(ns);

            this.namespaces[ns].rpc_methods[name] = fn;
        }

        /**
         * Creates a new event that can be emitted to clients.
         * @method
         * @param {String} name - event name
         * @param {String} ns - namespace identifier
         * @throws {TypeError}
         * @return {Undefined}
         */

    }, {
        key: "event",
        value: function event(name) {
            var _this2 = this;

            var ns = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "/";

            (0, _assertArgs2.default)(arguments, {
                "name": "string",
                "[ns]": "string"
            });

            if (!this.namespaces[ns]) this._generateNamespace(ns);

            this.namespaces[ns].events[name] = [];

            // forward emitted event to subscribers
            this.on(name, function () {
                for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
                    params[_key] = arguments[_key];
                }

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = (0, _getIterator3.default)(_this2.namespaces[ns].events[name]), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var socket_id = _step2.value;

                        _this2.namespaces[ns].clients.get(socket_id).send((0, _stringify2.default)({
                            notification: name,
                            params: params || null
                        }));
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            });
        }

        /**
         * Returns a requested namespace object
         * @method
         * @param {String} name - namespace identifier
         * @throws {TypeError}
         * @return {Object} - namespace object
         */

    }, {
        key: "of",
        value: function of(name) {
            (0, _assertArgs2.default)(arguments, {
                "name": "string"
            });

            if (!this.namespaces[name]) this._generateNamespace(name);

            var self = this;

            return {
                // self.register convenience method
                register: function register(fn_name, fn) {
                    if (arguments.length !== 2) throw new Error("must provide exactly two arguments");

                    if (typeof fn_name !== "string") throw new Error("name must be a string");

                    if (typeof fn !== "function") throw new Error("handler must be a function");

                    self.register(fn_name, fn, name);
                },


                // self.event convenience method
                event: function event(ev_name) {
                    if (arguments.length !== 1) throw new Error("must provide exactly one argument");

                    if (typeof ev_name !== "string") throw new Error("name must be a string");

                    self.event(ev_name, name);
                },


                // self.eventList convenience method
                get eventList() {
                    return (0, _keys2.default)(self.namespaces[name].events);
                },

                /**
                 * Emits a specified event to this namespace.
                 * @inner
                 * @method
                 * @param {String} event - event name
                 * @param {Array} params - event parameters
                 * @return {Undefined}
                 */
                emit: function emit(event, params) {
                    var socket_ids = [].concat((0, _toConsumableArray3.default)(self.namespaces[name].clients.keys()));

                    for (var i = 0, id; id = socket_ids[i]; ++i) {
                        self.namespaces[name].clients.get(id).send((0, _stringify2.default)({
                            notification: event,
                            params: params || []
                        }));
                    }
                },


                /**
                 * Returns a name of this namespace.
                 * @inner
                 * @method
                 * @kind constant
                 * @return {String}
                 */
                get name() {
                    return name;
                },

                /**
                 * Returns a hash of websocket objects connected to this namespace.
                 * @inner
                 * @method
                 * @return {Object}
                 */
                connected: function connected() {
                    var clients = {};
                    var socket_ids = [].concat((0, _toConsumableArray3.default)(self.namespaces[name].clients.keys()));

                    for (var i = 0, id; id = socket_ids[i]; ++i) {
                        clients[id] = self.namespaces[name].clients.get(id);
                    }return clients;
                },


                /**
                 * Returns a list of client unique identifiers connected to this namespace.
                 * @inner
                 * @method
                 * @return {Array}
                 */
                clients: function clients() {
                    return self.namespaces[name];
                }
            };
        }

        /**
         * Lists all created events in a given namespace. Defaults to "/".
         * @method
         * @param {String} ns - namespaces identifier
         * @readonly
         * @return {Array} - returns a list of created events
         */

    }, {
        key: "eventList",
        value: function eventList() {
            var ns = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "/";

            (0, _assertArgs2.default)(arguments, {
                "[ns]": "string"
            });

            if (!this.namespaces[ns]) return [];

            return (0, _keys2.default)(this.namespaces[ns].events);
        }

        /**
         * Creates a JSON-RPC 2.0 compliant error
         * @method
         * @param {Number} code - indicates the error type that occurred
         * @param {String} message - provides a short description of the error
         * @param {String|Object} data - details containing additional information about the error
         * @return {Object}
         */

    }, {
        key: "createError",
        value: function createError(code, message, data) {
            (0, _assertArgs2.default)(arguments, {
                "code": "number",
                "message": "string",
                "[data]": ["string", "object"]
            });

            return {
                code: code,
                message: message,
                data: data || null
            };
        }

        /**
         * Closes the server and terminates all clients.
         * @method
         * @return {Promise}
         */

    }, {
        key: "close",
        value: function close() {
            var _this3 = this;

            return new _promise2.default(function (resolve, reject) {
                try {
                    _this3.wss.close();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        }

        /**
         * Handles all WebSocket JSON RPC 2.0 requests.
         * @private
         * @param {Object} socket - ws socket instance
         * @param {String} ns - namespaces identifier
         * @return {Undefined}
         */

    }, {
        key: "_handleRPC",
        value: function _handleRPC(socket) {
            var _this4 = this;

            var ns = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "/";

            socket.on("message", function () {
                var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(data) {
                    var msg_options, responses, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, message, _response, response;

                    return _regenerator2.default.wrap(function _callee$(_context) {
                        while (1) {
                            switch (_context.prev = _context.next) {
                                case 0:
                                    msg_options = {};


                                    if (data instanceof ArrayBuffer) {
                                        msg_options.binary = true;

                                        data = Buffer.from(data).toString();
                                    }

                                    _context.prev = 2;
                                    data = JSON.parse(data);_context.next = 9;
                                    break;

                                case 6:
                                    _context.prev = 6;
                                    _context.t0 = _context["catch"](2);
                                    return _context.abrupt("return", socket.send((0, _stringify2.default)({
                                        jsonrpc: "2.0",
                                        error: utils.createError(-32700, _context.t0.toString()),
                                        id: data.id || null
                                    }, msg_options)));

                                case 9:
                                    if (!Array.isArray(data)) {
                                        _context.next = 46;
                                        break;
                                    }

                                    if (data.length) {
                                        _context.next = 12;
                                        break;
                                    }

                                    return _context.abrupt("return", socket.send((0, _stringify2.default)({
                                        jsonrpc: "2.0",
                                        error: utils.createError(-32600, "Invalid array"),
                                        id: null
                                    }, msg_options)));

                                case 12:
                                    responses = [];
                                    _iteratorNormalCompletion3 = true;
                                    _didIteratorError3 = false;
                                    _iteratorError3 = undefined;
                                    _context.prev = 16;
                                    _iterator3 = (0, _getIterator3.default)(data);

                                case 18:
                                    if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                                        _context.next = 29;
                                        break;
                                    }

                                    message = _step3.value;
                                    _context.next = 22;
                                    return _this4._runMethod(message, socket._id, ns);

                                case 22:
                                    _response = _context.sent;

                                    if (_response) {
                                        _context.next = 25;
                                        break;
                                    }

                                    return _context.abrupt("continue", 26);

                                case 25:

                                    responses.push(_response);

                                case 26:
                                    _iteratorNormalCompletion3 = true;
                                    _context.next = 18;
                                    break;

                                case 29:
                                    _context.next = 35;
                                    break;

                                case 31:
                                    _context.prev = 31;
                                    _context.t1 = _context["catch"](16);
                                    _didIteratorError3 = true;
                                    _iteratorError3 = _context.t1;

                                case 35:
                                    _context.prev = 35;
                                    _context.prev = 36;

                                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                        _iterator3.return();
                                    }

                                case 38:
                                    _context.prev = 38;

                                    if (!_didIteratorError3) {
                                        _context.next = 41;
                                        break;
                                    }

                                    throw _iteratorError3;

                                case 41:
                                    return _context.finish(38);

                                case 42:
                                    return _context.finish(35);

                                case 43:
                                    if (responses.length) {
                                        _context.next = 45;
                                        break;
                                    }

                                    return _context.abrupt("return");

                                case 45:
                                    return _context.abrupt("return", socket.send(_circularJson2.default.stringify(responses), msg_options));

                                case 46:
                                    _context.next = 48;
                                    return _this4._runMethod(data, socket._id, ns);

                                case 48:
                                    response = _context.sent;

                                    if (response) {
                                        _context.next = 51;
                                        break;
                                    }

                                    return _context.abrupt("return");

                                case 51:
                                    return _context.abrupt("return", socket.send(_circularJson2.default.stringify(response), msg_options));

                                case 52:
                                case "end":
                                    return _context.stop();
                            }
                        }
                    }, _callee, _this4, [[2, 6], [16, 31, 35, 43], [36,, 38, 42]]);
                }));

                return function (_x5) {
                    return _ref.apply(this, arguments);
                };
            }());
        }

        /**
         * Runs a defined RPC method.
         * @private
         * @param {Object} message - a message received
         * @param {Object} socket_id - user's socket id
         * @param {String} ns - namespaces identifier
         * @return {Object|undefined}
         */

    }, {
        key: "_runMethod",
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(message, socket_id) {
                var ns = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "/";

                var results, event_names, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, name, index, _results, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, _name, _index, response;

                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!((typeof message === "undefined" ? "undefined" : (0, _typeof3.default)(message)) !== "object")) {
                                    _context2.next = 2;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32600),
                                    id: null
                                });

                            case 2:
                                if (!(message.jsonrpc !== "2.0")) {
                                    _context2.next = 4;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32600, "Invalid JSON RPC version"),
                                    id: message.id || null
                                });

                            case 4:
                                if (message.method) {
                                    _context2.next = 6;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32602, "Method not specified"),
                                    id: message.id || null
                                });

                            case 6:
                                if (!(typeof message.method !== "string")) {
                                    _context2.next = 8;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32600, "Invalid method name"),
                                    id: message.id || null
                                });

                            case 8:
                                if (!(message.params && typeof message.params === "string")) {
                                    _context2.next = 10;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32600),
                                    id: message.id || null
                                });

                            case 10:
                                if (!(message.method === "rpc.on")) {
                                    _context2.next = 48;
                                    break;
                                }

                                if (message.params) {
                                    _context2.next = 13;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32000),
                                    id: message.id || null
                                });

                            case 13:
                                results = {};
                                event_names = (0, _keys2.default)(this.namespaces[ns].events);
                                _iteratorNormalCompletion4 = true;
                                _didIteratorError4 = false;
                                _iteratorError4 = undefined;
                                _context2.prev = 18;
                                _iterator4 = (0, _getIterator3.default)(message.params);

                            case 20:
                                if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                                    _context2.next = 31;
                                    break;
                                }

                                name = _step4.value;
                                index = event_names.indexOf(name);

                                if (!(index === -1)) {
                                    _context2.next = 26;
                                    break;
                                }

                                results[name] = "provided event invalid";
                                return _context2.abrupt("continue", 28);

                            case 26:

                                this.namespaces[ns].events[event_names[index]].push(socket_id);

                                results[name] = "ok";

                            case 28:
                                _iteratorNormalCompletion4 = true;
                                _context2.next = 20;
                                break;

                            case 31:
                                _context2.next = 37;
                                break;

                            case 33:
                                _context2.prev = 33;
                                _context2.t0 = _context2["catch"](18);
                                _didIteratorError4 = true;
                                _iteratorError4 = _context2.t0;

                            case 37:
                                _context2.prev = 37;
                                _context2.prev = 38;

                                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                                    _iterator4.return();
                                }

                            case 40:
                                _context2.prev = 40;

                                if (!_didIteratorError4) {
                                    _context2.next = 43;
                                    break;
                                }

                                throw _iteratorError4;

                            case 43:
                                return _context2.finish(40);

                            case 44:
                                return _context2.finish(37);

                            case 45:
                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    result: results,
                                    id: message.id || null
                                });

                            case 48:
                                if (!(message.method === "rpc.off")) {
                                    _context2.next = 86;
                                    break;
                                }

                                if (message.params) {
                                    _context2.next = 51;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32000),
                                    id: message.id || null
                                });

                            case 51:
                                _results = {};
                                _iteratorNormalCompletion5 = true;
                                _didIteratorError5 = false;
                                _iteratorError5 = undefined;
                                _context2.prev = 55;
                                _iterator5 = (0, _getIterator3.default)(message.params);

                            case 57:
                                if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                                    _context2.next = 71;
                                    break;
                                }

                                _name = _step5.value;

                                if (this.namespaces[ns].events[_name]) {
                                    _context2.next = 62;
                                    break;
                                }

                                _results[_name] = "provided event invalid";
                                return _context2.abrupt("continue", 68);

                            case 62:
                                _index = this.namespaces[ns].events[_name].indexOf(socket_id);

                                if (!(_index === -1)) {
                                    _context2.next = 66;
                                    break;
                                }

                                _results[_name] = "not subscribed";
                                return _context2.abrupt("continue", 68);

                            case 66:

                                this.namespaces[ns].events[_name].splice(_index, 1);
                                _results[_name] = "ok";

                            case 68:
                                _iteratorNormalCompletion5 = true;
                                _context2.next = 57;
                                break;

                            case 71:
                                _context2.next = 77;
                                break;

                            case 73:
                                _context2.prev = 73;
                                _context2.t1 = _context2["catch"](55);
                                _didIteratorError5 = true;
                                _iteratorError5 = _context2.t1;

                            case 77:
                                _context2.prev = 77;
                                _context2.prev = 78;

                                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                                    _iterator5.return();
                                }

                            case 80:
                                _context2.prev = 80;

                                if (!_didIteratorError5) {
                                    _context2.next = 83;
                                    break;
                                }

                                throw _iteratorError5;

                            case 83:
                                return _context2.finish(80);

                            case 84:
                                return _context2.finish(77);

                            case 85:
                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    result: _results,
                                    id: message.id || null
                                });

                            case 86:
                                if (this.namespaces[ns].rpc_methods[message.method]) {
                                    _context2.next = 88;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: utils.createError(-32601),
                                    id: message.id || null
                                });

                            case 88:
                                response = null;
                                _context2.prev = 89;
                                _context2.next = 92;
                                return this.namespaces[ns].rpc_methods[message.method](message.params, { socket_id: socket_id });

                            case 92:
                                response = _context2.sent;
                                _context2.next = 102;
                                break;

                            case 95:
                                _context2.prev = 95;
                                _context2.t2 = _context2["catch"](89);

                                if (message.id) {
                                    _context2.next = 99;
                                    break;
                                }

                                return _context2.abrupt("return");

                            case 99:
                                if (!(_context2.t2 instanceof Error)) {
                                    _context2.next = 101;
                                    break;
                                }

                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: {
                                        code: -32000,
                                        message: _context2.t2.name,
                                        data: _context2.t2.message
                                    },
                                    id: message.id
                                });

                            case 101:
                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    error: _context2.t2,
                                    id: message.id
                                });

                            case 102:
                                if (message.id) {
                                    _context2.next = 104;
                                    break;
                                }

                                return _context2.abrupt("return");

                            case 104:
                                return _context2.abrupt("return", {
                                    jsonrpc: "2.0",
                                    result: response,
                                    id: message.id
                                });

                            case 105:
                            case "end":
                                return _context2.stop();
                        }
                    }
                }, _callee2, this, [[18, 33, 37, 45], [38,, 40, 44], [55, 73, 77, 85], [78,, 80, 84], [89, 95]]);
            }));

            function _runMethod(_x7, _x8) {
                return _ref2.apply(this, arguments);
            }

            return _runMethod;
        }()

        /**
         * Generate a new namespace store
         * @private
         * @param {String} name - namespaces identifier
         * @return {undefined}
         */

    }, {
        key: "_generateNamespace",
        value: function _generateNamespace(name) {
            this.namespaces[name] = {
                rpc_methods: new Array(),
                clients: new _map2.default(),
                events: {}
            };
        }
    }]);
    return Server;
}(_eventemitter2.default);

exports.default = Server;
module.exports = exports["default"];