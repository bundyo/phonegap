#include "utility.h"
#include "mainwindow.h"

#include <QCoreApplication>
#include <QNetworkDiskCache>


Utility::Utility(QObject *parent) :
    QObject(parent) {
}

void Utility::loadUrl(QString url, QString loadingDialog, bool clearHistory, bool openExternal) {
    if (loadingDialog != "") {
        QStringList names = loadingDialog.split(",");

        if (QMLDialog) {
            QMLDialog->setProperty( "titleText", names[0] );
            QMLDialog->setProperty( "contentText", names[1] );
            QMLDialog->setProperty( "button1Visible", false );
            QMLDialog->setProperty( "button2Visible", false );
            QMetaObject::invokeMethod(QMLDialog, "open");
        }
    }

    if (clearHistory)
        ((QDeclarativeWebView*) QMLWebView)->history()->clear();

    ((QDeclarativeWebView*) QMLWebView)->setUrl(QUrl::fromUserInput(url));
}

void Utility::cancelLoadUrl() {
    QMetaObject::invokeMethod(QMLWebView, "stop");
}

void Utility::clearCache() {
    ((QDeclarativeWebView*) QMLWebView)->page()->networkAccessManager()->cache()->clear();
}

void Utility::clearHistory() {

    ((QDeclarativeWebView*) QMLWebView)->history()->clear();
}

void Utility::backHistory() {

    ((QDeclarativeWebView*) QMLWebView)->history()->back();
}

void Utility::exit() {

    qApp->quit();
}
