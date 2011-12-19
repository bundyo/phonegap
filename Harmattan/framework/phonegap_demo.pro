#------------------------------------------------------------------------------------#
#                                                                                    #
# Modify this file to reflect your setup (or better use the QT Creator Projects tab) #
#                                                                                    #
#------------------------------------------------------------------------------------#

QT += core gui webkit network declarative

TARGET = phonegap_demo
TEMPLATE = app

SOURCES += \
    cookiejar.cpp \
    extensions.cpp \
    main.cpp \
    mainwindow.cpp \
    networkaccessmanager.cpp \
    webpage.cpp \
    extensions/accelerometer.cpp \
    extensions/deviceinfo.cpp \
    extensions/geolocation.cpp \
    extensions/hash.cpp \
    extensions/notification.cpp \
    extensions/utility.cpp \
    webview.cpp \
    scrollbar.cpp \
    kineticscroll.cpp \
    extensions/compass.cpp \
    extensions/camera.cpp

HEADERS += \
    cookiejar.h \
    extensions.h \
    mainwindow.h \
    networkaccessmanager.h \
    webpage.h \
    extensions/accelerometer.h \
    extensions/deviceinfo.h \
    extensions/geolocation.h \
    extensions/hash.h \
    extensions/notification.h \
    extensions/utility.h \
    main.h \
    webview.h \
    scrollbar.h \
    kineticscroll.h \
    extensions/compass.h \
    extensions/camera.h

CONFIG += mobility camerainterface-maemo-meegotouch #qtdbus qdeclarative-boostable
MOBILITY = location sensors systeminfo feedback contacts messaging multimedia gallery

contains(MEEGO_EDITION,harmattan) {

    desktopfile.files = $${TARGET}.desktop
    desktopfile.path = /usr/share/applications
    icon.files = phonegap_demo.png
    icon.path = /usr/share/icons/hicolor/80x80/apps

    phonegap_app.source = ../app
    phonegap_app.target =
    phonegap_js.source = ../js
    phonegap_js.target = app
    phonegap_qml.source = ../qml
    phonegap_qml.target =
    DEPLOYMENTFOLDERS = phonegap_app phonegap_js phonegap_qml

    installPrefix = /opt/$${TARGET}
    for(deploymentfolder, DEPLOYMENTFOLDERS) {
        item = item$${deploymentfolder}
        itemfiles = $${item}.files
        $$itemfiles = $$eval($${deploymentfolder}.source)
        itempath = $${item}.path
        $$itempath = $${installPrefix}/$$eval($${deploymentfolder}.target)
        export($$itemfiles)
        export($$itempath)
        INSTALLS += $$item
    }

    !isEmpty(desktopfile.path) {
        export(icon.files)
        export(icon.path)
        export(desktopfile.files)
        export(desktopfile.path)
        INSTALLS += icon desktopfile
    }

    target.path = $${installPrefix}/bin
    export(target.path)
    INSTALLS += target
}

OTHER_FILES += \
    qtc_packaging/debian_harmattan/rules \
    qtc_packaging/debian_harmattan/README \
    qtc_packaging/debian_harmattan/manifest.aegis \
    qtc_packaging/debian_harmattan/copyright \
    qtc_packaging/debian_harmattan/control \
    qtc_packaging/debian_harmattan/compat \
    qtc_packaging/debian_harmattan/changelog \
    qtc_packaging/debian_harmattan/phonegap_demo80.png \
    qtc_packaging/debian_harmattan/phonegap_demo_harmattan.desktop





























