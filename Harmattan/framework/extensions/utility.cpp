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
            QMLView->show();
            QMLDialog->setProperty( "titleText", names[0] );
            QMLDialog->setProperty( "contentText", names[1] );
            QMLDialog->setProperty( "button1Visible", false );
            QMLDialog->setProperty( "button2Visible", false );
            QMetaObject::invokeMethod(QMLDialog, "open");
        }
    }

    if (clearHistory)
        webView->history()->clear();

    webView->setUrl(QUrl::fromUserInput(url));
}

void Utility::cancelLoadUrl() {
    webView->stop();
}

void Utility::clearCache() {
    webView->page()->networkAccessManager()->cache()->clear();
}

void Utility::clearHistory() {

    webView->history()->clear();
}

void Utility::backHistory() {

    webView->back();
}

void Utility::exit() {

    qApp->quit();
}
