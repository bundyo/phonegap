#ifndef WEBPAGE_H
#define WEBPAGE_H

#include <QWebPage>

class WebPage : public QWebPage {

    Q_OBJECT

    public:
        explicit WebPage(QObject *parent = 0);

    protected:
        void javaScriptAlert(QWebFrame *originatingFrame, const QString& msg);
        bool javaScriptConfirm(QWebFrame *originatingFrame, const QString& msg);
        bool javaScriptPrompt(QWebFrame *originatingFrame, const QString& msg, const QString& defaultValue, QString* result);
        void javaScriptConsoleMessage(const QString &message, int lineNumber, const QString &sourceId);
        QString userAgentForUrl ( const QUrl & url ) const;
        void viewportChangeRequested();

    private slots:
        void loadFinished(bool ok);
};

#endif // WEBPAGE_H
