#include "mainwindow.h"
#include "networkaccessmanager.h"
#include "webpage.h"

#include <QDebug>
#include <QMessageBox>
#include <QWebFrame>
#include <QString>
#include <QFileInfo>

const int defaultWidth = 854;
const int defaultHeight = 800;

WebPage::WebPage(QObject *parent) :
    QWebPage(parent) {

    setNetworkAccessManager(new NetworkAccessManager(this));

    connect(this, SIGNAL(loadFinished(bool)), SLOT(loadFinished(bool)));
}

void WebPage::javaScriptAlert(QWebFrame *originatingFrame, const QString& message) {
    if (QMLDialog) {
        QMLView->show();
        QMLDialog->setProperty( "titleText", "Alert" );
        QMLDialog->setProperty( "contentText", message );
        QMLDialog->setProperty( "button1Text", "Ok" );
        QMLDialog->setProperty( "button2Visible", false );
        QMetaObject::invokeMethod(QMLDialog, "open");
    }
}

bool WebPage::javaScriptConfirm(QWebFrame *originatingFrame, const QString& message) {
    if (QMLDialog) {
        QMLView->show();
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

void WebPage::viewportChangeRequested() {
    qreal pixelScale = 1.0;

    QSize viewportSize = QSize(defaultWidth, defaultHeight);

    QWebPage::ViewportAttributes hints = ViewportAttributes();

    if (hints.size().width() > 0)
        viewportSize.setWidth(hints.size().width());
    if (hints.size().height() > 0)
        viewportSize.setHeight(hints.size().height());

    setPreferredContentsSize(viewportSize / pixelScale);

    if (hints.initialScaleFactor() > 0) {
        webView->setZoomScale(hints.initialScaleFactor() * pixelScale);
    } else {
        webView->setZoomScale(1.0 * pixelScale);
    }

}

void WebPage::loadFinished(bool ok) {

    if (!ok) {
        QMessageBox::warning(0, "Error", "There was an error loading the page " + mainFrame()->url().toString());
    }
}
