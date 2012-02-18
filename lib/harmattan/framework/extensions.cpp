#include "extensions.h"
#include "extensions/accelerometer.h"
#include "extensions/camera.h"
#include "extensions/compass.h"
#include "extensions/contacts.h"
#include "extensions/deviceinfo.h"
#include "extensions/geolocation.h"
#include "extensions/hash.h"
#include "extensions/notification.h"
#include "extensions/utility.h"

#include <QWebFrame>


Extensions::Extensions(QDeclarativeWebView *webView) :
    QObject(webView) {

    m_frame = webView->page()->mainFrame();
    connect(m_frame, SIGNAL(javaScriptWindowObjectCleared()), SLOT(attachExtensions()));

    m_extensions["GapAccelerometer"] = new Accelerometer(this);
    m_extensions["GapNotification"] = new Notification(this);
    m_extensions["GapGeolocation"] = new Geolocation(this);
    m_extensions["GapDeviceInfo"] = new DeviceInfo(this);
    m_extensions["GapContacts"] = new Contacts(this);
    m_extensions["GapUtility"] = new Utility(this);
    m_extensions["GapCompass"] = new Compass(this);
    m_extensions["GapCamera"] = new Camera(this);
    m_extensions["GapHash"] = new Hash(this);

    attachExtensions();
}

void Extensions::attachExtensions() {

    foreach (QString name, m_extensions.keys()) {
        m_frame->addToJavaScriptWindowObject(name, m_extensions[name]);
    }
}
