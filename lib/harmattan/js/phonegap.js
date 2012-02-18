/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

/**
 * This represents the PhoneGap API itself, and provides a global namespace for accessing
 * information about the state of PhoneGap.
 */
var PhoneGap = PhoneGap || (function() {

    /**
     * PhoneGap object.
     */
    var PhoneGap = {
        documentEventHandler: {},   // Collection of custom document event handlers
        windowEventHandler: {}      // Collection of custom window event handlers
    };

    //----------------------------------------------
    // Publish/subscribe channels for initialization
    //----------------------------------------------

    /**
     * The order of events during page load and PhoneGap startup is as follows:
     *
     * onDOMContentLoaded         Internal event that is received when the web page is loaded and parsed.
     * window.onload              Body onload event.
     * onNativeReady              Internal event that indicates the PhoneGap native side is ready.
     * onPhoneGapInit             Internal event that kicks off creation of all PhoneGap JavaScript objects (runs constructors).
     * onPhoneGapReady            Internal event fired when all PhoneGap JavaScript objects have been created
     * onPhoneGapInfoReady        Internal event fired when device properties are available
     * onDeviceReady              User event fired to indicate that PhoneGap is ready
     * onResume                   User event fired to indicate a start/resume lifecycle event
     * onPause                    User event fired to indicate a background/pause lifecycle event
     *
     * The only PhoneGap events that user code should register for are:
     *      onDeviceReady
     *      onResume
     *      onPause
     *
     * Listeners can be registered as:
     *      document.addEventListener("deviceready", myDeviceReadyListener, false);
     *      document.addEventListener("resume", myResumeListener, false);
     *      document.addEventListener("pause", myPauseListener, false);
     */

    /**
     * Custom pub-sub channel that can have functions subscribed to it
     */
    PhoneGap.Channel = function(type) {
        this.type = type;
        this.handlers = { };
        this.guid = 0;
        this.fired = false;
        this.enabled = true;
    };

    /**
     * Subscribes the given function to the channel. Any time that
     * Channel.fire is called so too will the function.
     * Optionally specify an execution context for the function
     * and a guid that can be used to stop subscribing to the channel.
     * Returns the guid.
     */
    PhoneGap.Channel.prototype.subscribe = function(f, c, g) {
        // need a function to call
        if (f == null) { return; }

        var func = f;
        if (typeof c == "object" && f instanceof Function) { func = PhoneGap.close(c, f); }

        g = g || func.observer_guid || f.observer_guid || this.guid++;
        func.observer_guid = g;
        f.observer_guid = g;
        this.handlers[g] = func;
        return g;
    };

    /**
     * Like subscribe but the function is only called once and then it
     * auto-unsubscribes itself.
     */
    PhoneGap.Channel.prototype.subscribeOnce = function(f, c) {
        var g = null;
        var _this = this;
        var m = function() {
            f.apply(c || null, arguments);
            _this.unsubscribe(g);
        };
        if (this.fired) {
            if (typeof c == "object" && f instanceof Function) { f = PhoneGap.close(c, f); }
            f.apply(this, this.fireArgs);
        } else {
            g = this.subscribe(m);
        }
        return g;
    };

    /**
     * Unsubscribes the function with the given guid from the channel.
     */
    PhoneGap.Channel.prototype.unsubscribe = function(g) {
        if (g instanceof Function) { g = g.observer_guid; }
        this.handlers[g] = null;
        delete this.handlers[g];
    };

    /**
     * Calls all functions subscribed to this channel.
     */
    PhoneGap.Channel.prototype.fire = function(e) {
        if (this.enabled) {
            var fail = false;
            for (var item in this.handlers) {
                var handler = this.handlers[item];
                if (handler instanceof Function) {
                    var rv = (handler.apply(this, arguments)==false);
                    fail = fail || rv;
                }
            }
            this.fired = true;
            this.fireArgs = arguments;
            return !fail;
        }
        return true;
    };

    /**
     * Calls the provided function only after all of the channels specified
     * have been fired.
     */
    PhoneGap.Channel.join = function(h, c) {
        var i = c.length;
        var len = i;
        var f = function() {
            if (!(--i)) h();
        };
        for (var j=0; j<len; j++) {
            (!c[j].fired?c[j].subscribeOnce(f):i--);
        }
        if (!i) h();
    };

    /**
     * onDOMContentLoaded channel is fired when the DOM content
     * of the page has been parsed.
     */
    PhoneGap.onDOMContentLoaded = new PhoneGap.Channel('onDOMContentLoaded');

    /**
     * onNativeReady channel is fired when the PhoneGap native code
     * has been initialized.
     */
    PhoneGap.onNativeReady = new PhoneGap.Channel('onNativeReady');

    /**
     * onPhoneGapInit channel is fired when the web page is fully loaded and
     * PhoneGap native code has been initialized.
     */
    PhoneGap.onPhoneGapInit = new PhoneGap.Channel('onPhoneGapInit');

    /**
     * onPhoneGapReady channel is fired when the JS PhoneGap objects have been created.
     */
    PhoneGap.onPhoneGapReady = new PhoneGap.Channel('onPhoneGapReady');

    /**
     * onPhoneGapInfoReady channel is fired when the PhoneGap device properties
     * has been set.
     */
    PhoneGap.onPhoneGapInfoReady = new PhoneGap.Channel('onPhoneGapInfoReady');

    /**
     * onPhoneGapConnectionReady channel is fired when the PhoneGap connection properties
     * has been set.
     */
    PhoneGap.onPhoneGapConnectionReady = new PhoneGap.Channel('onPhoneGapConnectionReady');

    /**
     * onResume channel is fired when the PhoneGap native code
     * resumes.
     */
    PhoneGap.onResume = new PhoneGap.Channel('onResume');

    /**
     * onPause channel is fired when the PhoneGap native code
     * pauses.
     */
    PhoneGap.onPause = new PhoneGap.Channel('onPause');

    /**
     * onDeviceReady is fired only after all PhoneGap objects are created and
     * the device properties are set.
     */
    PhoneGap.onDeviceReady = new PhoneGap.Channel('onDeviceReady');

    /**
     * PhoneGap Channels that must fire before "deviceready" is fired.
     */
    PhoneGap.deviceReadyChannelsArray = [ PhoneGap.onPhoneGapReady, PhoneGap.onPhoneGapInfoReady, PhoneGap.onPhoneGapConnectionReady ];

    /**
     * User-defined channels that must also fire before "deviceready" is fired.
     */
    PhoneGap.deviceReadyChannelsMap = {};

    /**
     * Indicate that a feature needs to be initialized before it is ready to be
     * used. This holds up PhoneGap's "deviceready" event until the feature has been
     * initialized and PhoneGap.initializationComplete(feature) is called.
     *
     * @param feature {String} The unique feature name
     */
    PhoneGap.waitForInitialization = function(feature) {
        if (feature) {
            console.log(feature);
            var channel = new PhoneGap.Channel(feature);
            PhoneGap.deviceReadyChannelsMap[feature] = channel;
            PhoneGap.deviceReadyChannelsArray.push(channel);
        }
    };

    /**
     * Indicate that initialization code has completed and the feature is ready to
     * be used.
     *
     * @param feature {String} The unique feature name
     */
    PhoneGap.initializationComplete = function(feature) {
        var channel = PhoneGap.deviceReadyChannelsMap[feature];
        if (channel) {
            channel.fire();
        }
    };

    /**
     * Create all PhoneGap objects once page has fully loaded and native side is ready.
     */
    PhoneGap.Channel.join(function() {
        // Run PhoneGap constructors
        PhoneGap.onPhoneGapInit.fire();

        // Fire event to notify that all objects are created
        PhoneGap.onPhoneGapReady.fire();

        // Fire onDeviceReady event once all constructors have run and
        // PhoneGap info has been received from native side.
        PhoneGap.Channel.join(function() {
            PhoneGap.onDeviceReady.fire();
        }, PhoneGap.deviceReadyChannelsArray);

    }, [ PhoneGap.onDOMContentLoaded, PhoneGap.onNativeReady ]);

    //---------------
    // Event handling
    //---------------

    /**
     * Listen for DOMContentLoaded and notify our channel subscribers.
     */
    document.addEventListener('DOMContentLoaded', function() {
        PhoneGap.onDOMContentLoaded.fire();
    }, false);

    // Intercept calls to document.addEventListener
    PhoneGap.m_document_addEventListener = document.addEventListener;

    // Intercept calls to window.addEventListener
    PhoneGap.m_window_addEventListener = window.addEventListener;

    /**
     * Add a custom window event handler.
     *
     * @param {String} event            The event name that callback handles
     * @param {Function} callback       The event handler
     */
    PhoneGap.addWindowEventHandler = function(event, callback) {
        PhoneGap.windowEventHandler[event] = callback;
    };

    /**
     * Add a custom document event handler.
     *
     * @param {String} event            The event name that callback handles
     * @param {Function} callback       The event handler
     */
    PhoneGap.addDocumentEventHandler = function(event, callback) {
        PhoneGap.documentEventHandler[event] = callback;
    };

    /**
     * Intercept adding document event listeners and handle our own
     *
     * @param {Object} evt
     * @param {Function} handler
     * @param capture
     */
    document.addEventListener = function(evt, handler, capture) {
        var e = evt.toLowerCase();
        if (e == 'deviceready') {
            PhoneGap.onDeviceReady.subscribeOnce(handler);
        } else if (e == 'resume') {
            PhoneGap.onResume.subscribe(handler);
            // if subscribing listener after event has already fired, invoke the handler
            if (PhoneGap.onResume.fired && handler instanceof Function) {
                handler();
            }
        } else if (e == 'pause') {
            PhoneGap.onPause.subscribe(handler);
        } else {
            if (typeof PhoneGap.documentEventHandler[e] !== "undefined") {
                if (PhoneGap.documentEventHandler[e](e, handler, true)) {
                    return; // Stop default behavior
                }
            }

            PhoneGap.m_document_addEventListener.call(document, evt, handler, capture);
        }
    };

    /**
     * Intercept adding window event listeners and handle our own
     *
     * @param {Object} evt
     * @param {Function} handler
     * @param capture
     */
    window.addEventListener = function(evt, handler, capture) {
        var e = evt.toLowerCase();

        // If subscribing to an event that is handled by a plugin
        if (typeof PhoneGap.windowEventHandler[e] !== "undefined") {
            if (PhoneGap.windowEventHandler[e](e, handler, true)) {
                return; // Stop default behavior
            }
        }

        PhoneGap.m_window_addEventListener.call(window, evt, handler, capture);
    };

    // Intercept calls to document.removeEventListener and watch for events that
    // are generated by PhoneGap native code
    PhoneGap.m_document_removeEventListener = document.removeEventListener;

    // Intercept calls to window.removeEventListener
    PhoneGap.m_window_removeEventListener = window.removeEventListener;

    /**
     * Intercept removing document event listeners and handle our own
     *
     * @param {Object} evt
     * @param {Function} handler
     * @param capture
     */
    document.removeEventListener = function(evt, handler, capture) {
        var e = evt.toLowerCase();

        // If unsubcribing from an event that is handled by a plugin
        if (typeof PhoneGap.documentEventHandler[e] !== "undefined") {
            if (PhoneGap.documentEventHandler[e](e, handler, false)) {
                return; // Stop default behavior
            }
        }

        PhoneGap.m_document_removeEventListener.call(document, evt, handler, capture);
    };

    /**
     * Intercept removing window event listeners and handle our own
     *
     * @param {Object} evt
     * @param {Function} handler
     * @param capture
     */
    window.removeEventListener = function(evt, handler, capture) {
        var e = evt.toLowerCase();

        // If unsubcribing from an event that is handled by a plugin
        if (typeof PhoneGap.windowEventHandler[e] !== "undefined") {
            if (PhoneGap.windowEventHandler[e](e, handler, false)) {
                return; // Stop default behavior
            }
        }

        PhoneGap.m_window_removeEventListener.call(window, evt, handler, capture);
    };

    /**
     * Method to fire document event
     *
     * @param {String} type             The event type to fire
     * @param {Object} data             Data to send with event
     */
    PhoneGap.fireDocumentEvent = function(type, data) {
        var e = document.createEvent('Events');
        e.initEvent(type, false, false);
        if (data) {
            for (var i in data) {
                e[i] = data[i];
            }
        }
        document.dispatchEvent(e);
    };

    /**
     * Method to fire window event
     *
     * @param {String} type             The event type to fire
     * @param {Object} data             Data to send with event
     */
    PhoneGap.fireWindowEvent = function(type, data) {
        var e = document.createEvent('Events');
        e.initEvent(type, false, false);
        if (data) {
            for (var i in data) {
                e[i] = data[i];
            }
        }
        window.dispatchEvent(e);
    };

    //--------
    // Plugins
    //--------

    /**
     * Add an initialization function to a queue that ensures it will run and
     * initialize application constructors only once PhoneGap has been initialized.
     *
     * @param {Function} func The function callback you want run once PhoneGap is initialized
     */
    PhoneGap.addConstructor = function(func) {
        PhoneGap.onPhoneGapInit.subscribeOnce(function() {
            try {
                func();
            } catch(e) {
                if (console && typeof(console['log']) == 'function') {
                    console.log("Failed to run constructor: " + e.message);
                } else {
                    alert("Failed to run constructor: " + e.message);
                }
            }
        });
    };

    /**
     * Plugins object.
     */
    if (!window.plugins) {
        window.plugins = {};
    }

    /**
     * Adds new plugin object to window.plugins.
     * The plugin is accessed using window.plugins.<name>
     *
     * @param name      The plugin name
     * @param obj       The plugin object
     */
    PhoneGap.addPlugin = function(name, obj) {
        if (!window.plugins[name]) {
            window.plugins[name] = obj;
        }
        else {
            console.log("Plugin " + name + " already exists.");
        }
    };

    /**
     * Plugin callback mechanism.
     */
    PhoneGap.callbackId = 0;
    PhoneGap.callbacks  = {};
    PhoneGap.callbackStatus = {
        NO_RESULT: 0,
        OK: 1,
        CLASS_NOT_FOUND_EXCEPTION: 2,
        ILLEGAL_ACCESS_EXCEPTION: 3,
        INSTANTIATION_EXCEPTION: 4,
        MALFORMED_URL_EXCEPTION: 5,
        IO_EXCEPTION: 6,
        INVALID_ACTION: 7,
        JSON_EXCEPTION: 8,
        ERROR: 9
    };

    /**
     * Called by native code when returning successful result from an action.
     *
     * @param callbackId
     * @param args
     */
    PhoneGap.callbackSuccess = function(callbackId, args) {
        if (PhoneGap.callbacks[callbackId]) {

            // If result is to be sent to callback
            if (args.status == PhoneGap.callbackStatus.OK) {
                try {
                    if (PhoneGap.callbacks[callbackId].success) {
                        PhoneGap.callbacks[callbackId].success(args.message);
                    }
                }
                catch (e) {
                    console.log("Error in success callback: "+callbackId+" = "+e);
                }
            }

            // Clear callback if not expecting any more results
            if (!args.keepCallback) {
                delete PhoneGap.callbacks[callbackId];
            }
        }
    };

    /**
     * Called by native code when returning error result from an action.
     *
     * @param callbackId
     * @param args
     */
    PhoneGap.callbackError = function(callbackId, args) {
        if (PhoneGap.callbacks[callbackId]) {
            try {
                if (PhoneGap.callbacks[callbackId].fail) {
                    PhoneGap.callbacks[callbackId].fail(args.message);
                }
            }
            catch (e) {
                console.log("Error in error callback: "+callbackId+" = "+e);
            }

            // Clear callback if not expecting any more results
            if (!args.keepCallback) {
                delete PhoneGap.callbacks[callbackId];
            }
        }
    };

    /**
     * Execute a PhoneGap command.  It is up to the native side whether this action
     * is synchronous or asynchronous.  The native side can return:
     *      Synchronous: PluginResult object as a JSON string
     *      Asynchrounous: Empty string ""
     * If async, the native side will PhoneGap.callbackSuccess or PhoneGap.callbackError,
     * depending upon the result of the action.
     *
     * @param {Function} success    The success callback
     * @param {Function} fail       The fail callback
     * @param {String} service      The name of the service to use
     * @param {String} action       Action to be run in PhoneGap
     * @param {String[]} [args]     Zero or more arguments to pass to the method
     */
    PhoneGap.exec = function(success, fail, service, action, args) {
        try {
            var callbackId = service + PhoneGap.callbackId++;
            if (success || fail) {
                PhoneGap.callbacks[callbackId] = {success:success, fail:fail};
            }

            // Note: Device returns string, but for some reason emulator returns object - so convert to string.
            var r = ""+phonegap.PluginManager.exec(service, action, callbackId, JSON.stringify(args), true);

            // If a result was returned
            if (r.length > 0) {
                eval("var v="+r+";");

                // If status is OK, then return value back to caller
                if (v.status == PhoneGap.callbackStatus.OK) {

                    // If there is a success callback, then call it now with returned value
                    if (success) {
                        try {
                            success(v.message);
                        }
                        catch (e) {
                            console.log("Error in success callback: "+callbackId+" = "+e);
                        }

                        // Clear callback if not expecting any more results
                        if (!v.keepCallback) {
                            delete PhoneGap.callbacks[callbackId];
                        }
                    }
                    return v.message;
                }
                // If no result
                else if (v.status == PhoneGap.callbackStatus.NO_RESULT) {

                    // Clear callback if not expecting any more results
                    if (!v.keepCallback) {
                        delete PhoneGap.callbacks[callbackId];
                    }
                }
                // If error, then display error
                else {
                    console.log("Error: Status="+r.status+" Message="+v.message);

                    // If there is a fail callback, then call it now with returned value
                    if (fail) {
                        try {
                            fail(v.message);
                        }
                        catch (e) {
                            console.log("Error in error callback: "+callbackId+" = "+e);
                        }

                        // Clear callback if not expecting any more results
                        if (!v.keepCallback) {
                            delete PhoneGap.callbacks[callbackId];
                        }
                    }
                    return null;
                }
            }
        } catch (e) {
            console.log("Error: "+e);
        }
    };

    //------------------
    // Utility functions
    //------------------

    /**
     * Does a deep clone of the object.
     */
    PhoneGap.clone = function(obj) {
        if(!obj) {
            return obj;
        }

        if(obj instanceof Array){
            var retVal = new Array();
            for(var i = 0; i < obj.length; ++i){
                retVal.push(PhoneGap.clone(obj[i]));
            }
            return retVal;
        }

        if (obj instanceof Function) {
            return obj;
        }

        if(!(obj instanceof Object)){
            return obj;
        }

        if(obj instanceof Date){
            return obj;
        }

        retVal = new Object();
        for(i in obj){
            if(!(i in retVal) || retVal[i] != obj[i]) {
                retVal[i] = PhoneGap.clone(obj[i]);
            }
        }
        return retVal;
    };

    PhoneGap.close = function(context, func, params) {
        if (typeof params === 'undefined') {
            return function() {
                return func.apply(context, arguments);
            };
        } else {
            return function() {
                return func.apply(context, params);
            };
        }
    };

    /**
     * Create a UUID
     */
    PhoneGap.createUUID = function() {
        return PhoneGap.UUIDcreatePart(4) + '-' +
            PhoneGap.UUIDcreatePart(2) + '-' +
            PhoneGap.UUIDcreatePart(2) + '-' +
            PhoneGap.UUIDcreatePart(2) + '-' +
            PhoneGap.UUIDcreatePart(6);
    };

    PhoneGap.UUIDcreatePart = function(length) {
        var uuidpart = "";
        for (var i=0; i<length; i++) {
            var uuidchar = parseInt((Math.random() * 256)).toString(16);
            if (uuidchar.length == 1) {
                uuidchar = "0" + uuidchar;
            }
            uuidpart += uuidchar;
        }
        return uuidpart;
    };

    /**
     * Extends a child object from a parent object using classical inheritance
     * pattern.
     */
    PhoneGap.extend = (function() {
        // proxy used to establish prototype chain
        var F = function() {};
        // extend Child from Parent
        return function(Child, Parent) {
            F.prototype = Parent.prototype;
            Child.prototype = new F();
            Child.__super__ = Parent.prototype;
            Child.prototype.constructor = Child;
        };
    }());

    return PhoneGap;
}());

/**
 * navigator.device
 *
 * Represents the mobile device, and provides properties for inspecting the
 * model, version, UUID of the phone, etc.
 */
(function() {
    /**
     * @constructor
     */
    function Device() {
        this.name = GapDeviceInfo.name;
        this.platform = GapDeviceInfo.platform;
        this.uuid = GapDeviceInfo.uuid;
        this.version = GapDeviceInfo.version;
        this.phonegap = '1.3.0';
    };

    /**
     * Define navigator.device.
     */
    PhoneGap.addConstructor(function() {
        if (typeof navigator.device === "undefined") {
            navigator.device = window.device = new Device();
        }
        PhoneGap.onPhoneGapInfoReady.fire();
    });
})();

/**
 * navigator.notification
 *
 * Provides access to notifications on the device.
 */
(function() {
    /**
     * Check that navigator.notification has not been initialized.
     */
    if (typeof navigator.notification !== "undefined") {
        return;
    }

    /**
     * @constructor
     */
    function Notification() {
    };

    /**
     * Open a native alert dialog, with a customizable title and button text.
     * @param {String}   message          Message to print in the body of the alert
     * @param {Function} completeCallback The callback that is invoked when user clicks a button.
     * @param {String}   title            Title of the alert dialog (default: 'Alert')
     * @param {String}   buttonLabel      Label of the close button (default: 'OK')
     */
    Notification.prototype.alert = function(message, completeCallback, title, buttonLabel) {
        var _title = (title || "Alert");
        var _buttonLabel = (buttonLabel || "OK");
        GapNotification.alert(message, _title, _buttonLabel);
        this.callback = completeCallback;
    };

    /**
     * Open a custom confirmation dialog, with a customizable title and button text.
     * @param {String}  message         Message to print in the body of the dialog
     * @param {Function}resultCallback  The callback that is invoked when a user clicks a button.
     * @param {String}  title           Title of the alert dialog (default: 'Confirm')
     * @param {String}  buttonLabels    Comma separated list of the button labels (default: 'OK,Cancel')
     */
    Notification.prototype.confirm = function(message, resultCallback, title, buttonLabels) {
        var _title = (title || "Confirm");
        var _buttonLabels = (buttonLabels || "OK,Cancel");
        var result = GapNotification.confirm(message, _title, _buttonLabels);
        this.callback = resultCallback;
        return result;
    };

    /**
     * Causes the device to vibrate.
     * @param {Integer} mills The number of milliseconds to vibrate for.
     */
    Notification.prototype.vibrate = function(mills) {
        GapNotification.vibrate(mills);
    };

    /**
     * Causes the device to beep.
     * @param {Integer} count The number of beeps.
     */
    Notification.prototype.beep = function(count) {
        GapNotification.beep(count);
    };

    /**
     * Define navigator.notification object.
     */
    PhoneGap.addConstructor(function() {
        navigator.notification = new Notification();
    });
})();

/**
 * Network status
 */
Connection = {
    UNKNOWN: "unknown",
    ETHERNET: "ethernet",
    WIFI: "wifi",
    CELL_2G: "2g",
    CELL_3G: "3g",
    CELL_4G: "4g",
    NONE: "none"
};

NetworkStatus = {
    NOT_REACHABLE: 0,
    REACHABLE_VIA_CARRIER_DATA_NETWORK: 1,
    REACHABLE_VIA_WIFI_NETWORK: 2
};

/**
 * navigator.network
 */
(function() {
    /**
     * Check to see that navigator.network has not been initialized.
     */
    if (typeof navigator.network !== "undefined") {
        return;
    }

    /**
     * This class contains information about the current network Connection.
     * @constructor
     */
    var NetworkConnection = function() {
        this.type = null;
        this._firstRun = true;

        var me = this;
        this.getInfo(
            function(info) {
                me.type = info.type;
                if (typeof info.event !== "undefined") {
                    PhoneGap.fireDocumentEvent(info.event);
                }

                // should only fire this once
                if (me._firstRun) {
                    me._firstRun = false;
                    PhoneGap.onPhoneGapConnectionReady.fire();
                }
            },
            function(e) {
                // If we can't get the network info we should still tell PhoneGap
                // to fire the deviceready event.
                if (me._firstRun) {
                    me._firstRun = false;
                    PhoneGap.onPhoneGapConnectionReady.fire();
                }
                console.log("Error initializing Network Connection: " + e);
            });
    };

    /**
     * Get connection info
     *
     * @param {Function} successCallback The function to call when the Connection data is available
     * @param {Function} errorCallback The function to call when there is an error getting the Connection data. (OPTIONAL)
     */
    NetworkConnection.prototype.getInfo = function(successCallback, errorCallback) {
        // Get info
        successCallback({ type: GapDeviceInfo.network });
    };

    /**
     * Define navigator.network and navigator.network.connection objects
     */
    PhoneGap.addConstructor(function() {
        navigator.network = new Object();

        navigator.network.connection = new NetworkConnection();
        navigator.network.isReachable = function (address, successCallback, errorCallback) {
                                    var output = "";
                                    switch (GapDeviceInfo.network) {
                                        case Connection.CELL_2G:
                                        case Connection.CELL_3G:
                                        case Connection.CELL_4G:
                                            output = NetworkStatus.REACHABLE_VIA_CARRIER_DATA_NETWORK;
                                            break;
                                        case Connection.WIFI:
                                            output = NetworkStatus.REACHABLE_VIA_WIFI_NETWORK;
                                            break;
                                        default:
                                            output = NetworkStatus.NOT_REACHABLE;
                                            break;
                                    }

                                    successCallback(output); // TODO: Better handling for this.
                            };
    });
})();

/**
 * Acceleration object has 3D coordinates and timestamp.
 */
var Acceleration = function(accelObject) {
    return {
        x: accelObject.x,
        y: accelObject.y,
        z: accelObject.z,
        timestamp: new Date().getTime()
    }
};

/**
 * navigator.accelerometer
 *
 * Provides access to device accelerometer data.
 */
(function() {
    /**
     * Check that navigator.accelerometer has not been initialized.
     */
    if (typeof navigator.accelerometer !== "undefined") {
        return;
    }

    /**
     * @constructor
     */
    function Accelerometer() {
        /**
         * The last known acceleration. type=Acceleration()
         */
        this.lastAcceleration = null;

        /**
         * List of accelerometer watch timers
         */
        this.timers = {};
    };

    /**
     * Asynchronously acquires the current acceleration.
     *
     * @param {Function} successCallback    The function to call when the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     */
    Accelerometer.prototype.getCurrentAcceleration = function(successCallback, errorCallback, options) {
        // successCallback required
        if (typeof successCallback !== "function") {
            console.log("Accelerometer Error: successCallback is not a function");
            return;
        }

        // errorCallback optional
        if (errorCallback && (typeof errorCallback !== "function")) {
            console.log("Accelerometer Error: errorCallback is not a function");
            return;
        }

        // Get acceleration
        try {
            this.lastAcceleration = Acceleration(GapAccelerometer.getCurrentAcceleration());
            successCallback(this.lastAcceleration);
        } catch(err) {
            errorCallback();
        }
    };

    /**
     * Asynchronously acquires the device acceleration at a given interval.
     *
     * @param {Function} successCallback    The function to call each time the acceleration data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
     * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    Accelerometer.prototype.watchAcceleration = function(successCallback, errorCallback, options) {
        // Default interval (10 secs)
        var frequency = (options != undefined)? options.frequency : 10000,
            self = this;

        // successCallback required
        if (typeof successCallback != "function") {
            console.log("Accelerometer Error: successCallback is not a function");
            return;
        }

        // errorCallback optional
        if (errorCallback && (typeof errorCallback != "function")) {
            console.log("Accelerometer Error: errorCallback is not a function");
            return;
        }

        var id = PhoneGap.createUUID();
        navigator.accelerometer.timers[id] = setInterval(function () {
            self.getCurrentAcceleration(successCallback, errorCallback);
        }, frequency);

        return id;
    };

    /**
     * Clears the specified accelerometer watch.
     *
     * @param {String} id The id of the watch returned from #watchAcceleration.
     */
    Accelerometer.prototype.clearWatch = function(id) {
        // Stop timer & remove from timer list
        if (id && navigator.accelerometer.timers[id] != undefined) {
            clearInterval(navigator.accelerometer.timers[id]);
            delete navigator.accelerometer.timers[id];
        }
    };

    /**
     * Define navigator.accelerometer object.
     */
    PhoneGap.addConstructor(function() {
        navigator.accelerometer = new Accelerometer();
    });
})();

var CompassState = function(headingObject) {
    return {
        magneticHeading: headingObject.azymuth,
        trueHeading: headingObject.azymuth,
        headingAccuracy: 0,
        calibrationLevel: headingObject.calibrationLevel,
        timestamp: new Date().getTime()
    }
};

/**
 * navigator.compass
 *
 * Provides access to device compass data.
 */
(function() {
    /**
     * Check that navigator.compass has not been initialized.
     */
    if (typeof navigator.compass !== "undefined") {
        return;
    }

    /**
     * @constructor
     */
    function Compass() {
        /**
         * The last known compassState. type=CompassState()
         */
        this.lastCompassState = null;

        /**
         * List of compass watch timers
         */
        this.timers = {};
    };

    /**
     * Asynchronously acquires the current compass heading.
     *
     * @param {Function} successCallback    The function to call when the compass data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the compass data. (OPTIONAL)
     * @param {CompassOptions} options      The options for getting the compass data such as timeout. (OPTIONAL)
     */
    Compass.prototype.getCurrentHeading = function(successCallback, errorCallback, options) {
        // successCallback required
        if (typeof successCallback !== "function") {
            console.log("Compass Error: successCallback is not a function");
            return;
        }

        // errorCallback optional
        if (errorCallback && (typeof errorCallback !== "function")) {
            console.log("Compass Error: errorCallback is not a function");
            return;
        }

        // Get compass state
        try {
            this.lastCompassState = CompassState(GapCompass.getCurrentHeading());
            successCallback(this.lastCompassState);
        } catch(err) {
            errorCallback();
        }
    };

    /**
     * Asynchronously acquires the device compass heading at a given interval.
     *
     * @param {Function} successCallback    The function to call each time the compass data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the compass data. (OPTIONAL)
     * @param {CompassOptions} options      The options for getting the compass data such as timeout. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    Compass.prototype.watchHeading = function(successCallback, errorCallback, options) {
        // Default interval 100ms
        var frequency = (options != undefined)? options.frequency : 100,
            self = this;

        // successCallback required
        if (typeof successCallback != "function") {
            console.log("Compass Error: successCallback is not a function");
            return;
        }

        // errorCallback optional
        if (errorCallback && (typeof errorCallback != "function")) {
            console.log("Compass Error: errorCallback is not a function");
            return;
        }

        var id = PhoneGap.createUUID();
        navigator.compass.timers[id] = setInterval(function () {
            self.getCurrentHeading(successCallback, errorCallback);
        }, frequency);

        return id;
    };

    /**
     * Clears the specified compass watch.
     *
     * @param {String} id The id of the watch returned from #watchHeading.
     */
    Compass.prototype.clearWatch = function(id) {
        // Stop timer & remove from timer list
        if (id && navigator.compass.timers[id] != undefined) {
            clearInterval(navigator.compass.timers[id]);
            delete navigator.compass.timers[id];
        }
    };

    /**
     * Define navigator.compass object.
     */
    PhoneGap.addConstructor(function() {
        navigator.compass = new Compass();
    });
})();


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

/**
 * ContactError
 */
var ContactError = function(code) {
    this.code = code;
};

ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.TIMEOUT_ERROR = 2;
ContactError.PENDING_OPERATION_ERROR = 3;
ContactError.IO_ERROR = 4;
ContactError.NOT_SUPPORTED_ERROR = 5;
ContactError.PERMISSION_DENIED_ERROR = 20;

/**
 * Contact name.
 * @param formatted full name formatted for display
 * @param familyName family or last name
 * @param givenName given or first name
 * @param middle middle name
 * @param prefix honorific prefix or title
 * @param suffix honorific suffix
 */
var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
    this.formatted = formatted || null;
    this.familyName = familyName || null;
    this.givenName = givenName || null;
    this.middleName = middle || null;
    this.honorificPrefix = prefix || null;
    this.honorificSuffix = suffix || null;
};

/**
 * Generic contact field.
 * @param type contains the type of information for this field, e.g. 'home', 'mobile'
 * @param value contains the value of this field
 * @param pref indicates whether this instance is preferred
 */
var ContactField = function(type, value, pref) {
    this.type = type || null;
    this.value = value || null;
    this.pref = pref || false;
};

/**
 * Contact address.
 * @param pref indicates whether this instance is preferred
 * @param type contains the type of address, e.g. 'home', 'work'
 * @param formatted full physical address, formatted for display
 * @param streetAddress street address
 * @param locality locality or city
 * @param region region or state
 * @param postalCode postal or zip code
 * @param country country name
 */
var ContactAddress = function(pref, type, formatted, streetAddress, locality, region, postalCode, country) {
    this.pref = pref || false;
    this.type = type || null;
    this.formatted = formatted || null;
    this.streetAddress = streetAddress || null;
    this.locality = locality || null;
    this.region = region || null;
    this.postalCode = postalCode || null;
    this.country = country || null;
};

/**
 * Contact organization.
 * @param pref indicates whether this instance is preferred
 * @param type contains the type of organization
 * @param name name of organization
 * @param dept department
 * @param title job title
 */
var ContactOrganization = function(pref, type, name, dept, title) {
    this.pref = pref || false;
    this.type = type || null;
    this.name = name || null;
    this.department = dept || null;
    this.title = title || null;
};

/**
 * Contact object.
 */
var Contact = Contact || (function() {
    /**
     * Contains information about a single contact.
     * @param {DOMString} id unique identifier
     * @param {DOMString} displayName
     * @param {ContactName} name
     * @param {DOMString} nickname
     * @param {ContactField[]} phoneNumbers array of phone numbers
     * @param {ContactField[]} emails array of email addresses
     * @param {ContactAddress[]} addresses array of addresses
     * @param {ContactField[]} ims instant messaging user ids
     * @param {ContactOrganization[]} organizations
     * @param {Date} birthday contact's birthday
     * @param {DOMString} note user notes about contact
     * @param {ContactField[]} photos
     * @param {DOMString[]} categories
     * @param {ContactField[]} urls contact's web sites
     */
    function Contact(id, displayName, name, nickname, phoneNumbers, emails, addresses,
        ims, organizations, birthday, note, photos, categories, urls) {
        this.id = id || null;
        this.displayName = displayName || null;
        this.name = name || null; // ContactName
        this.nickname = nickname || null;
        this.phoneNumbers = phoneNumbers || null; // ContactField[]
        this.emails = emails || null; // ContactField[]
        this.addresses = addresses || null; // ContactAddress[]
        this.ims = ims || null; // ContactField[]
        this.organizations = organizations || null; // ContactOrganization[]
        this.birthday = birthday || null;
        this.note = note || null;
        this.photos = photos || null; // ContactField[]
        this.categories = categories || null; // DOMString[]
        this.urls = urls || null; // ContactField[]
    };

    /**
     * Persists contact to device storage.
     */
    Contact.prototype.save = function(success, fail) {
        try {
            // save the contact and store it's unique id
            var fullContact = saveToDevice(this);
            this.id = fullContact.id;

            // This contact object may only have a subset of properties
            // if the save was an update of an existing contact.  This is
            // because the existing contact was likely retrieved using a subset
            // of properties, so only those properties were set in the object.
            // For this reason, invoke success with the contact object returned
            // by saveToDevice since it is fully populated.
            if (success) {
                success(fullContact);
            }
        } catch (e) {
            console.log('Error saving contact: ' + e);
            if (fail) {
                fail(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
    };

    /**
     * Removes contact from device storage.
     *
     * @param success success callback
     * @param fail error callback
     */
    Contact.prototype.remove = function(success, fail) {
        try {
            // retrieve contact from device by id
            var bbContact = null;
            if (this.id) {
                bbContact = findByUniqueId(this.id);
            }

            // if contact was found, remove it
            if (bbContact) {
                console.log('removing contact: ' + bbContact.uid);
                bbContact.remove();
                if (success) {
                    success(this);
                }
            }
            // attempting to remove a contact that hasn't been saved
            else if (fail) {
                fail(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
        catch (e) {
            console.log('Error removing contact ' + this.id + ": " + e);
            if (fail) {
                fail(new ContactError(ContactError.UNKNOWN_ERROR));
            }
        }
    };

    /**
     * Creates a deep copy of this Contact.
     *
     * @return copy of this Contact
     */
    Contact.prototype.clone = function() {
        var clonedContact = PhoneGap.clone(this);
        clonedContact.id = null;
        return clonedContact;
    };

    //------------------
    // Utility functions
    //------------------

    /**
     * Retrieves a BlackBerry contact from the device by unique id.
     *
     * @param uid Unique id of the contact on the device
     * @return {blackberry.pim.Contact} BlackBerry contact or null if contact
     * with specified id is not found
     */
    var findByUniqueId = function(uid) {
        if (!uid) {
            return null;
        }
        var bbContacts = blackberry.pim.Contact.find(
                new blackberry.find.FilterExpression("uid", "==", uid));
        return bbContacts[0] || null;
    };

    /**
     * Creates a BlackBerry contact object from the W3C Contact object
     * and persists it to device storage.
     *
     * @param {Contact} contact The contact to save
     * @return a new contact object with all properties set
     */
    var saveToDevice = function(contact) {

        if (!contact) {
            return;
        }

        var bbContact = null;
        var update = false;

        // if the underlying BlackBerry contact already exists, retrieve it for update
        if (contact.id) {
            // we must attempt to retrieve the BlackBerry contact from the device
            // because this may be an update operation
            bbContact = findByUniqueId(contact.id);
        }

        // contact not found on device, create a new one
        if (!bbContact) {
            bbContact = new blackberry.pim.Contact();
        }
        // update the existing contact
        else {
            update = true;
        }

        // NOTE: The user may be working with a partial Contact object, because only
        // user-specified Contact fields are returned from a find operation (blame
        // the W3C spec).  If this is an update to an existing Contact, we don't
        // want to clear an attribute from the contact database simply because the
        // Contact object that the user passed in contains a null value for that
        // attribute.  So we only copy the non-null Contact attributes to the
        // BlackBerry contact object before saving.
        //
        // This means that a user must explicitly set a Contact attribute to a
        // non-null value in order to update it in the contact database.
        //
        // name
        if (contact.name !== null) {
            if (contact.name.givenName) {
                bbContact.firstName = contact.name.givenName;
            }
            if (contact.name.familyName) {
                bbContact.lastName = contact.name.familyName;
            }
            if (contact.name.honorificPrefix) {
                bbContact.title = contact.name.honorificPrefix;
            }
        }

        // display name
        if (contact.displayName !== null) {
            bbContact.user1 = contact.displayName;
        }

        // note
        if (contact.note !== null) {
            bbContact.note = contact.note;
        }

        // birthday
        //
        // user may pass in Date object or a string representation of a date
        // if it is a string, we don't know the date format, so try to create a
        // new Date with what we're given
        //
        // NOTE: BlackBerry's Date.parse() does not work well, so use new Date()
        //
        if (contact.birthday !== null) {
            if (contact.birthday instanceof Date) {
                bbContact.birthday = contact.birthday;
            } else {
                var bday = contact.birthday.toString();
                bbContact.birthday = (bday.length > 0) ? new Date(bday) : "";
            }
        }

        // BlackBerry supports three email addresses
        if (contact.emails && contact.emails instanceof Array) {

            // if this is an update, re-initialize email addresses
            if (update) {
                bbContact.email1 = "";
                bbContact.email2 = "";
                bbContact.email3 = "";
            }

            // copy the first three email addresses found
            var email = null;
            for (var i=0; i<contact.emails.length; i+=1) {
                email = contact.emails[i];
                if (!email || !email.value) {
                    continue;
                }
                if (bbContact.email1 === "") {
                    bbContact.email1 = email.value;
                }
                else if (bbContact.email2 === "") {
                    bbContact.email2 = email.value;
                }
                else if (bbContact.email3 === "") {
                    bbContact.email3 = email.value;
                }
            }
        }

        // BlackBerry supports a finite number of phone numbers
        // copy into appropriate fields based on type
        if (contact.phoneNumbers && contact.phoneNumbers instanceof Array) {

            // if this is an update, re-initialize phone numbers
            if (update) {
                bbContact.homePhone = "";
                bbContact.homePhone2 = "";
                bbContact.workPhone = "";
                bbContact.workPhone2 = "";
                bbContact.mobilePhone = "";
                bbContact.faxPhone = "";
                bbContact.pagerPhone = "";
                bbContact.otherPhone = "";
            }

            var type = null;
            var number = null;
            for (var i=0; i<contact.phoneNumbers.length; i+=1) {
                if (!contact.phoneNumbers[i] || !contact.phoneNumbers[i].value) {
                    continue;
                }
                type = contact.phoneNumbers[i].type;
                number = contact.phoneNumbers[i].value;
                if (type === 'home') {
                    if (bbContact.homePhone === "") {
                        bbContact.homePhone = number;
                    }
                    else if (bbContact.homePhone2 === "") {
                        bbContact.homePhone2 = number;
                    }
                } else if (type === 'work') {
                    if (bbContact.workPhone === "") {
                        bbContact.workPhone = number;
                    }
                    else if (bbContact.workPhone2 === "") {
                        bbContact.workPhone2 = number;
                    }
                } else if (type === 'mobile' && bbContact.mobilePhone === "") {
                    bbContact.mobilePhone = number;
                } else if (type === 'fax' && bbContact.faxPhone === "") {
                    bbContact.faxPhone = number;
                } else if (type === 'pager' && bbContact.pagerPhone === "") {
                    bbContact.pagerPhone = number;
                } else if (bbContact.otherPhone === "") {
                    bbContact.otherPhone = number;
                }
            }
        }

        // BlackBerry supports two addresses: home and work
        // copy the first two addresses found from Contact
        if (contact.addresses && contact.addresses instanceof Array) {

            // if this is an update, re-initialize addresses
            if (update) {
                bbContact.homeAddress = null;
                bbContact.workAddress = null;
            }

            var address = null;
            var bbHomeAddress = null;
            var bbWorkAddress = null;
            for (var i=0; i<contact.addresses.length; i+=1) {
                address = contact.addresses[i];
                if (!address || address instanceof ContactAddress === false) {
                    continue;
                }

                if (bbHomeAddress === null &&
                        (!address.type || address.type === "home")) {
                    bbHomeAddress = createBlackBerryAddress(address);
                    bbContact.homeAddress = bbHomeAddress;
                }
                else if (bbWorkAddress === null &&
                        (!address.type || address.type === "work")) {
                    bbWorkAddress = createBlackBerryAddress(address);
                    bbContact.workAddress = bbWorkAddress;
                }
            }
        }

        // copy first url found to BlackBerry 'webpage' field
        if (contact.urls && contact.urls instanceof Array) {

            // if this is an update, re-initialize web page
            if (update) {
                bbContact.webpage = "";
            }

            var url = null;
            for (var i=0; i<contact.urls.length; i+=1) {
                url = contact.urls[i];
                if (!url || !url.value) {
                    continue;
                }
                if (bbContact.webpage === "") {
                    bbContact.webpage = url.value;
                    break;
                }
            }
        }

        // copy fields from first organization to the
        // BlackBerry 'company' and 'jobTitle' fields
        if (contact.organizations && contact.organizations instanceof Array) {

            // if this is an update, re-initialize org attributes
            if (update) {
                bbContact.company = "";
            }

            var org = null;
            for (var i=0; i<contact.organizations.length; i+=1) {
                org = contact.organizations[i];
                if (!org) {
                    continue;
                }
                if (bbContact.company === "") {
                    bbContact.company = org.name || "";
                    bbContact.jobTitle = org.title || "";
                    break;
                }
            }
        }

        // categories
        if (contact.categories && contact.categories instanceof Array) {
            bbContact.categories = [];
            var category = null;
            for (var i=0; i<contact.categories.length; i+=1) {
                category = contact.categories[i];
                if (typeof category == "string") {
                    bbContact.categories.push(category);
                }
            }
        }

        // save to device
        bbContact.save();

        // invoke native side to save photo
        // fail gracefully if photo URL is no good, but log the error
        if (contact.photos && contact.photos instanceof Array) {
            var photo = null;
            for (var i=0; i<contact.photos.length; i+=1) {
                photo = contact.photos[i];
                if (!photo || !photo.value) {
                    continue;
                }
                PhoneGap.exec(
                        // success
                        function() {
                        },
                        // fail
                        function(e) {
                            console.log('Contact.setPicture failed:' + e);
                        },
                        "Contact", "setPicture", [bbContact.uid, photo.type, photo.value]
                );
                break;
            }
        }

        // Use the fully populated BlackBerry contact object to create a
        // corresponding W3C contact object.
        return navigator.contacts._createContact(bbContact, ["*"]);
    };

    /**
     * Creates a BlackBerry Address object from a W3C ContactAddress.
     *
     * @return {blackberry.pim.Address} a BlackBerry address object
     */
    var createBlackBerryAddress = function(address) {
        var bbAddress = new blackberry.pim.Address();

        if (!address) {
            return bbAddress;
        }

        bbAddress.address1 = address.streetAddress || "";
        bbAddress.city = address.locality || "";
        bbAddress.stateProvince = address.region || "";
        bbAddress.zipPostal = address.postalCode || "";
        bbAddress.country = address.country || "";

        return bbAddress;
    };

    return Contact;
}());

/**
 * Contact search criteria.
 * @param filter string-based search filter with which to search and filter contacts
 * @param multiple indicates whether multiple contacts should be returned (defaults to true)
 */
var ContactFindOptions = function(filter, multiple) {
    this.filter = filter || '';
    this.multiple = multiple || false;
};

/**
 * navigator.contacts
 *
 * Provides access to the device contacts database.
 */
(function() {
    /**
     * Check that navigator.contacts has not been initialized.
     */
    if (typeof navigator.contacts !== 'undefined') {
        return;
    }

    /**
     * @constructor
     */
    var Contacts = function() {
    };

    /**
     * This function creates a new contact, but it does not persist the contact
     * to device storage.  To persist the contact to device storage, invoke
     * <code>contact.save()</code>.
     */
    Contacts.prototype.create = function(properties) {
        var contact = new Contact();
        for (var i in properties) {
            if (contact[i] !== 'undefined') {
                contact[i] = properties[i];
            }
        }
        return contact;
    };

    /**
     * Returns an array of Contacts matching the search criteria.
     * @return array of Contacts matching search criteria
     */
    Contacts.prototype.find = function(fields, success, fail, options) {

        // Success callback is required.  Throw exception if not specified.
        if (!success) {
            throw new TypeError("You must specify a success callback for the find command.");
        }

        // Search qualifier is required and cannot be empty.
        if (!fields || !(fields instanceof Array) || fields.length == 0) {
            if (typeof fail === "function") {
                fail(new ContactError(ContactError.INVALID_ARGUMENT_ERROR));
            }
            return;
        } else if (fields.length == 1 && fields[0] === "*") {
            // PhoneGap enhancement to allow fields value of ["*"] to indicate
            // all supported fields.
            fields = allFields;
        }

        // build the filter expression to use in find operation
        var filterFields = buildFilter(fields);

        // find matching contacts
        // Note: the filter expression can be null here, in which case, the find won't filter
        var contacts = GapContacts.findContacts(filterFields, options.filter, options.multiple);

        // return results
        if (success && success instanceof Function) {
            success(contacts);
        } else {
            console.log("Error invoking Contacts.find success callback.");
        }
    };

    //---------------
    // Find utilities
    //---------------

    /**
     * Mappings for each Contact field that may be used in a find operation.
     * Maps W3C Contact fields to one or more fields in Harmattan.
     *
     * Example: user searches with a filter on the Contact 'name' field:
     *
     * <code>Contacts.find(['name'], onSuccess, onFail, {filter:'Bob'});</code>
     *
     * The 'name' field does not exist in a Harmattan contact.  Instead, a
     * filter will be built to search the contacts using 'title', 'firstName'
     * and 'lastName' fields.
     */
    var fieldMappings = {
         "id"                        : { name: "Guid", fields: { id: "Guid" }, array: false },
         "displayName"               : { name: "DisplayLabel", fields: { displayName: "Label" }, array: false },
         "name"                      : { name: "Name", fields: { formatted: [ "honorificPrefix", "givenName", "familyName" ], honorificPrefix: "Prefix", givenName: "FirstName", middleName: "MiddleName", familyName: "LastName", honorificSuffix: "Suffix" }, array: false, formatSeparator: " " },
         "phoneNumbers"              : { name: "PhoneNumber", fields: { pref: false, type: "Context", value: "PhoneNumber" }, array: true },
         "emails"                    : { name: "EmailAddress", fields: { pref: false, type: "Context", value: "EmailAddress" }, array: true },
         "addresses"                 : { name: "Address", fields: { pref: false, type: "Context", formatted: [ "streetAddress", "locality", "region", "postalCode", "country" ], streetAddress: "Street", region: "Region", postOfficeBox: "PostOfficeBox", postalCode: "Postcode", locality: "Locality", country: "Country" }, array: true, formatSeparator: ", " },
         "organizations"             : { name: "Organization", fields: { pref: false, type: "Context", name: "Name", title: "Title", department: "Department" }, array: true },
         "birthday"                  : { name: "Birthday", fields: { birthday: "Birthday" }, array: false },
         "note"                      : { name: "Note", fields: { note: "Note" }, array: false },
         "urls"                      : { name: "Url", fields: { pref: false, type: "Context", value: "Url" }, array: true },
         "photos"                    : { name: "Avatar", fields: { pref: false, type: false, value: "ImageUrl" }, array: true },
         "ringtones"                 : { name: "Ringtone", fields: { pref: false, type: false, value: "AudioRingtoneUrl" }, array: true },
         "gender"                    : { name: "Gender", fields: { gender: "Gender" }, array: false },
         "anniversaries"             : { name: "Anniversary", fields: { pref: false, type: false, value: "OriginalDate" }, array: true }
    };


    /*
     * Build an object of all of the valid W3C Contact fields.  This is used
     * to substitute all the fields when ["*"] is specified.
     */
    var allFields = {};
    for ( var key in fieldMappings) {
        if (fieldMappings.hasOwnProperty(key)) {
            allFields[key] = fieldMappings[key];
        }
    }

    /**
     * Builds a filter object for contact search using the
     * contact fields and search filter provided.
     *
     * @param {String[]} fields Array of Contact fields to search
     * @return filter or null if fields is empty
     */
    var buildFilter = function(fields) {
        var result = {};
        if (fields && fields instanceof Array) {
            for (var i in fields) {
                if (!fields[i]) {
                    continue;
                }

                var bbFields = fieldMappings[fields[i]];
                if (!bbFields) {
                    continue;
                }

                result[fields[i]] = bbFields;
            }
        }

        return result;
    };

    /**
     * Define navigator.contacts object.
     */
    PhoneGap.addConstructor(function() {
        navigator.contacts = new Contacts();
    });
})();




/**
 * navigator.camera
 *
 * Provides access to the device camera.
 */
var Camera = Camera || (function() {
    /**
     * Format of image that returned from getPicture.
     *
     * Example: navigator.camera.getPicture(success, fail,
     *              { quality: 80,
     *                destinationType: Camera.DestinationType.DATA_URL,
     *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
     */
    var DestinationType = {
        DATA_URL: 0,                // Return base64 encoded string
        FILE_URI: 1                 // Return file URI
    };

    /**
     * Source to getPicture from.
     *
     * Example: navigator.camera.getPicture(success, fail,
     *              { quality: 80,
     *                destinationType: Camera.DestinationType.DATA_URL,
     *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
     */
    var PictureSourceType = {       // Ignored on Blackberry
        PHOTOLIBRARY : 0,           // Choose image from picture library
        CAMERA : 1,                 // Take picture from camera
        SAVEDPHOTOALBUM : 2         // Choose image from picture library
    };

    /**
     * Encoding of image returned from getPicture.
     *
     * Example: navigator.camera.getPicture(success, fail,
     *              { quality: 80,
     *                destinationType: Camera.DestinationType.DATA_URL,
     *                sourceType: Camera.PictureSourceType.CAMERA,
     *                encodingType: Camera.EncodingType.PNG})
     */
    var EncodingType = {
        JPEG: 0,                    // Return JPEG encoded image
        PNG: 1                      // Return PNG encoded image
    };

    /**
     * @constructor
     */
    function Camera() {
        var self = this;

        self.successCallback = null;
        self.errorCallback = null;

        GapCamera.pictureCaptured.connect(function(image) {
            if (typeof(self.successCallback) == 'function') {
                console.log("pictureCaptured");
                self.successCallback(image);
            }
        });

        GapCamera.error.connect(function(errorCode, message) {
            if (typeof(self.errorCallback) == 'function') {
                self.errorCallback(message);
            }
        });
    };

    /**
     * Attach constants to Camera.prototype (this is not really necessary, but
     * we do it for backward compatibility).
     */
    Camera.prototype.DestinationType = DestinationType;
    Camera.prototype.PictureSourceType = PictureSourceType;
    Camera.prototype.EncodingType = EncodingType;

    /**
     * Gets a picture from source defined by "options.sourceType", and returns the
     * image as defined by the "options.destinationType" option.

     * The defaults are sourceType=CAMERA and destinationType=DATA_URL.
     *
     * @param {Function} successCallback
     * @param {Function} errorCallback
     * @param {Object} options
     */
    Camera.prototype.getPicture = function(successCallback, errorCallback, options) {

        // successCallback required
        if (typeof successCallback != "function") {
            console.log("Camera Error: successCallback is not a function");
            return;
        }

        // errorCallback optional
        if (errorCallback && (typeof errorCallback != "function")) {
            console.log("Camera Error: errorCallback is not a function");
            return;
        }

        if (typeof options.quality == "number") {
            quality = options.quality;
        } else if (typeof options.quality == "string") {
            var qlity = new Number(options.quality);
            if (isNaN(qlity) === false) {
                quality = qlity.valueOf();
            }
        }

        var destinationType = DestinationType.DATA_URL;
        if (options.destinationType) {
            destinationType = options.destinationType;
        }

        var sourceType = PictureSourceType.CAMERA;
        if (typeof options.sourceType == "number") {
            sourceType = options.sourceType;
        }

        var targetWidth = -1;
        if (typeof options.targetWidth == "number") {
            targetWidth = options.targetWidth;
        } else if (typeof options.targetWidth == "string") {
            var width = new Number(options.targetWidth);
            if (isNaN(width) === false) {
                targetWidth = width.valueOf();
            }
        }

        var targetHeight = -1;
        if (typeof options.targetHeight == "number") {
            targetHeight = options.targetHeight;
        } else if (typeof options.targetHeight == "string") {
            var height = new Number(options.targetHeight);
            if (isNaN(height) === false) {
                targetHeight = height.valueOf();
            }
        }

        var encodingType = EncodingType.JPEG;
        if (typeof options.encodingType == "number") {
            encodingType = options.encodingType;
        }

        this.successCallback = successCallback;
        this.errorCallback = errorCallback;

        GapCamera.takePicture(quality, destinationType, sourceType, targetWidth, targetHeight, encodingType);
    };

    /**
     * Define navigator.camera object.
     */
    PhoneGap.addConstructor(function() {
        navigator.camera = new Camera();
    });

    /**
     * Return an object that contains the static constants.
     */
    return {
        DestinationType: DestinationType,
        PictureSourceType: PictureSourceType,
        EncodingType: EncodingType
    };
}());

/**
 * Position error object
 *
 * @param code
 * @param message
 */
function PositionError(code, message) {
    this.code = code;
    this.message = message;
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

/**
 * navigator._geo
 *
 * Provides access to device GPS.
 */
var Geolocation = Geolocation || (function() {
    /**
     * @constructor
     */
    function Geolocation() {

        // The last known GPS position.
        this.lastPosition = null;
        this.lastError = null;

        // Geolocation listeners
        this.listeners = {};
    };

    /**
     * Acquires the current geo position.
     *
     * @param {Function} successCallback    The function to call when the position data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the position. (OPTIONAL)
     * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
     */
    Geolocation.prototype.getCurrentPosition = function(successCallback, errorCallback, options) {

        var id = "global";
        if (navigator._geo.listeners[id]) {
            console.log("Geolocation Error: Still waiting for previous getCurrentPosition() request.");
            try {
                errorCallback(new PositionError(PositionError.TIMEOUT,
                        "Geolocation Error: Still waiting for previous getCurrentPosition() request."));
            } catch (e) {
            }
            return;
        }

        // default maximumAge value should be 0, and set if positive
        var maximumAge = 0;

        // default timeout value should be infinity, but that's a really long time
        var timeout = 3600000;

        var enableHighAccuracy = false;
        if (options) {
            if (options.maximumAge && (options.maximumAge > 0)) {
                maximumAge = options.maximumAge;
            }
            if (options.enableHighAccuracy) {
                enableHighAccuracy = options.enableHighAccuracy;
            }
            if (options.timeout) {
                timeout = (options.timeout < 0) ? 0 : options.timeout;
            }
        }

        navigator._geo.listeners[id] = {
            "success" : successCallback,
            "fail" : errorCallback
        };

        try {
            GapGeolocation.getCurrentPosition(maximumAge, timeout, enableHighAccuracy);
            return id;
        } catch(err) {
            errorCallback(err);
            return -1;
        }
    };

    /**
     * Monitors changes to geo position.  When a change occurs, the successCallback
     * is invoked with the new location.
     *
     * @param {Function} successCallback    The function to call each time the location data is available
     * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
     * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
     * @return String                       The watch id that must be passed to #clearWatch to stop watching.
     */
    Geolocation.prototype.watchPosition = function(successCallback, errorCallback, options) {

        // default maximumAge value should be 0, and set if positive
        var maximumAge = 0;

        // DO NOT set timeout to a large value for watchPosition.
        // The interval used for updates is half the timeout value, so a large
        // timeout value will mean a long wait for the first location.
        var timeout = 10000;

        var enableHighAccuracy = false;
        if (options) {
            if (options.maximumAge && (options.maximumAge > 0)) {
                maximumAge = options.maximumAge;
            }
            if (options.enableHighAccuracy) {
                enableHighAccuracy = options.enableHighAccuracy;
            }
            if (options.timeout) {
                timeout = (options.timeout < 0) ? 0 : options.timeout;
            }
        }
        var id = PhoneGap.createUUID();
        navigator._geo.listeners[id] = {
            "success" : successCallback,
            "fail" : errorCallback
        };

        try {
            GapGeolocation.watchPosition(maximumAge, timeout, enableHighAccuracy);
            return id;
        } catch(err) {
            errorCallback(err);
            return -1;
        }
    };

    /*
     * Native callback when watch position has a new position.
     */
    Geolocation.prototype.success = function(id, result) {

        var p = result.message;
        var coords = new Coordinates(p.latitude, p.longitude, p.altitude,
                p.accuracy, p.heading, p.speed, p.alt_accuracy);
        var loc = new Position(coords, p.timestamp);
        try {
            navigator._geo.lastPosition = loc;
            navigator._geo.listeners[id].success(loc);
        }
        catch (e) {
            console.log("Geolocation Error: Error calling success callback function.");
        }

        if (id == "global") {
            delete navigator._geo.listeners["global"];
        }
    };

    /**
     * Native callback when watch position has an error.
     *
     * @param {String} id       The ID of the watch
     * @param {Object} result   The result containing status and message
     */
    Geolocation.prototype.fail = function(id, result) {
        var code = result.status;
        var msg = result.message;
        try {
            navigator._geo.listeners[id].fail(new PositionError(code, msg));
        }
        catch (e) {
            console.log("Geolocation Error: Error calling error callback function.");
        }

        if (id == "global") {
            delete navigator._geo.listeners["global"];
        }
    };

    /**
     * Clears the specified position watch.
     *
     * @param {String} id       The ID of the watch returned from #watchPosition
     */
    Geolocation.prototype.clearWatch = function(id) {
        delete navigator._geo.listeners[id];

        if (!Object.keys(navigator._geo.listeners).length)
            GapGeolocation.stop();
    };

    /**
     * Is PhoneGap implementation being used.
     */
    var usingPhoneGap = false;

    /**
     * Force PhoneGap implementation to override navigator.geolocation.
     */
    var usePhoneGap = function() {
        if (usingPhoneGap) {
            return;
        }
        usingPhoneGap = true;

        // Set built-in geolocation methods to our own implementations
        // (Cannot replace entire geolocation, but can replace individual methods)
        navigator.geolocation.getCurrentPosition = navigator._geo.getCurrentPosition;
        navigator.geolocation.watchPosition = navigator._geo.watchPosition;
        navigator.geolocation.clearWatch = navigator._geo.clearWatch;
        navigator.geolocation.success = navigator._geo.success;
        navigator.geolocation.fail = navigator._geo.fail;
    };

    /**
     * Define navigator.geolocation object.
     */
    PhoneGap.addConstructor(function() {
        navigator._geo = new Geolocation();

        // if no native geolocation object, use PhoneGap geolocation
        if (typeof navigator.geolocation === 'undefined') {
            navigator.geolocation = navigator._geo;
            usingPhoneGap = true;
        }
    });

    /**
     * Enable developers to override browser implementation.
     */
    return {
        usePhoneGap: usePhoneGap
    };
}());

// _nativeReady is global variable that the native side can set
// to signify that the native code is ready. It is a global since
// it may be called before any PhoneGap JS is ready.
if (typeof _nativeReady !== 'undefined') { PhoneGap.onNativeReady.fire(); }





(function() {

    /**
     * Constructor
     * @constructor
     */
    var App = function() {};

    /**
     * Clear the resource cache.
     */
    App.prototype.clearCache = function() {
        GapUtility.clearCache();
    };

    /**
     * Load the url into the webview or into new browser instance.
     *
     * @param url           The URL to load
     * @param props         Properties that can be passed in to the activity:
     *      wait: int                           => wait msec before loading URL
     *      loadingDialog: "Title,Message"      => display a native loading dialog
     *      loadUrlTimeoutValue: int            => time in msec to wait before triggering a timeout error
     *      clearHistory: boolean              => clear webview history (default=false)
     *      openExternal: boolean              => open in a new browser (default=false)
     *
     * Example:
     *      navigator.app.loadUrl("http://server/myapp/index.html", {wait:2000, loadingDialog:"Wait,Loading App", loadUrlTimeoutValue: 60000});
     */
    App.prototype.loadUrl = function(url, props) {
        var wait = props.wait || 0,
            loadingDialog = props.loadingDialog || "",
            loadUrlTimeoutValue = props.loadUrlTimeoutValue || 0,
            clearHistory = props.clearHistory || false,
            openExternal = props.openExternal || false;

        setTimeout( function () {
            GapUtility.loadUrl(url, loadingDialog, clearHistory, openExternal);

            setTimeout(function () {
                this.cancelLoadUrl();
            }, loadUrlTimeoutValue);
        }, wait);
    };

    /**
     * Cancel loadUrl that is waiting to be loaded.
     */
    App.prototype.cancelLoadUrl = function() {
        GapUtility.cancelLoadUrl();
    };

    /**
     * Clear web history in this web view.
     * Instead of BACK button loading the previous web page, it will exit the app.
     */
    App.prototype.clearHistory = function() {
        GapUtility.clearHistory();
    };

    /**
     * Go to previous page displayed.
     * This is the same as pressing the backbutton on Android device.
     */
    App.prototype.backHistory = function() {
        GapUtility.backHistory();
    };

    /**
     * Exit and terminate the application.
     */
    App.prototype.exitApp = function() {
        GapUtility.exit();
    };

    /**
     * Add entry to approved list of URLs (whitelist) that will be loaded into PhoneGap container instead of default browser.
     *
     * @param origin		URL regular expression to allow
     * @param subdomains	T=include all subdomains under origin
     */
    App.prototype.addWhiteListEntry = function(origin, subdomains) {
        //Not implemented
        //return PhoneGap.exec(null, null, "App", "addWhiteListEntry", [origin, subdomains]);
    };

    PhoneGap.addConstructor(function() {
        navigator.app = new App();
    });
})();

