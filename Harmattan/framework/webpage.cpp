#include "mainwindow.h"
#include "networkaccessmanager.h"
#include "webpage.h"

#include <QDebug>
#include <QMessageBox>
#include <QWebFrame>
#include <QString>
#include <QFileInfo>

WebPage::WebPage(QObject *parent) :
    QWebPage(parent) {

    setNetworkAccessManager(new NetworkAccessManager(this));

    connect(this, SIGNAL(loadFinished(bool)), SLOT(loadFinished(bool)));
}

void WebPage::javaScriptAlert(QWebFrame *originatingFrame, const QString& message) {
    if (QMLDialog) {
        QMLDialog->setProperty( "titleText", "Alert" );
        QMLDialog->setProperty( "contentText", message );
        QMLDialog->setProperty( "button1Text", "Ok" );
        QMLDialog->setProperty( "button2Visible", false );
        QMetaObject::invokeMethod(QMLDialog, "open");
    }
}

bool WebPage::javaScriptConfirm(QWebFrame *originatingFrame, const QString& message) {
    if (QMLDialog) {
        QMLDialog->setProperty( "titleText", "Confirm" );
        QMLDialog->setProperty( "contentText", message );
        QMLDialog->setProperty( "button1Text", "Ok" );
        QMLDialog->setProperty( "button2Visible", true );
        QMLDialog->setProperty( "button2Text", "Cancel" );
        QMetaObject::invokeMethod(QMLDialog, "open");
    }
    return true; // TODO: return proper confirmation;
}

bool WebPage::javaScriptPrompt(QWebFrame *originatingFrame, const QString& message, const QString& defaultValue, QString* result) {
    return true;
}

void WebPage::javaScriptConsoleMessage(const QString &message, int lineNumber, const QString &sourceId) {
    qDebug() << "Debug: " + QFileInfo(sourceId).fileName() + "|" + QString::number(lineNumber) + " - " + message;
}

QString WebPage::userAgentForUrl ( const QUrl & url ) const {
    return "Mozilla/5.0 (MeeGo; NokiaN9; PhoneGap) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13";
}

void WebPage::loadFinished(bool ok) {

//    if (!ok) {
//        QMessageBox::warning(0, "Error", "There was an error loading the page " + mainFrame()->url().toString());
//    }
}
