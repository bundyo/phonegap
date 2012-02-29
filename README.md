PhoneGap
========

PhoneGap is a web platform that exposes native mobile device apis and data to JavaScript.

### PhoneGap has been accepted into the Apache Software Foundation for incubation as Apache Cordova, where it will remain free and open source. This will ensure open, independent stewardship of the project over the long term.

---

More information on Apache Incubator Callback Project and the incubation process can be found here:
[http://incubator.apache.org/projects/callback.html](http://incubator.apache.org/projects/callback.html)

Get started
-----------

[phonegap.com/start](http://phonegap.com/start)

Community
---------

- [Website](http://phonegap.com)
- [Twitter](http://twitter.com/phonegap)
- [Facebook](http://facebook.com/phonegap)
- [Wiki](http://wiki.phonegap.com/)
- [Mailing List](http://groups.google.com/group/phonegap)
- [Issue Tracker](https://issues.apache.org/jira/browse/CB)
- [IRC](http://webchat.freenode.net/?channels=#phonegap)

Directory Structure
-------------------

	  |-doc/ ........... source documentation
	  |-lib/ ........... platform code for supported operating systems
	  | |-android/
	  | |-bada/
	  | |-blackberry/
	  | |-ios/
	  | |-symbian/
	  | |-webos/
	  | '-windows/
	  |-changelog ..... a changelog compiled from comments and authors
	  |-license ....... the Apache Software License v2
	  |-version ....... release version in plain text
	  '-readme.md ..... release readme

Harmattan Port Progress
-----------------------

Working so far:

- Camera
- Device
- Events
- Compass
- Storage
- Connection
- Geolocation
- Notification
- Accelerometer

Partially working:

- Contacts - only Contacts.find() is currently working.

Not working:

- File
- Media
- Capture

