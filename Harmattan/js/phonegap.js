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

    //    this.callBack.connect(function(result) {
    //        console.log("test");
    //        this.callback(result);
    //    });

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
//        PhoneGap.exec(completeCallback, null, 'Notification', 'alert', [message, _title, _buttonLabel]);
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
//        return PhoneGap.exec(resultCallback, null, 'Notification', 'confirm', [message, _title, _buttonLabels]);
        var result = GapNotification.confirm(message, _title, _buttonLabels);
        this.callback = resultCallback;
        return result;
    };

    /**
     * Causes the device to vibrate.
     * @param {Integer} mills The number of milliseconds to vibrate for.
     */
    Notification.prototype.vibrate = function(mills) {
        //PhoneGap.exec(null, null, 'Notification', 'vibrate', [mills]);
        GapNotification.vibrate(mills);
    };

    /**
     * Causes the device to beep.
     * @param {Integer} count The number of beeps.
     */
    Notification.prototype.beep = function(count) {
        //PhoneGap.exec(null, null, 'Notification', 'beep', [count]);
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
//        PhoneGap.exec(successCallback, errorCallback, "Network Status", "getConnectionInfo", []);
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
        // Default interval (10 sec)
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
            successCallback(this.lastCompassState.trueHeading);
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
        // Default interval (10 sec)
        var frequency = (options != undefined)? options.frequency : 10000,
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
            return PhoneGap.exec(null, null, "App", "addWhiteListEntry", [origin, subdomains]);
    };

    PhoneGap.addConstructor(function() {
        navigator.app = new App();
    });
})();

