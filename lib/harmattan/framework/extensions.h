#ifndef EXTENSIONS_H
#define EXTENSIONS_H

#include <QMap>
#include <QWebView>
#include <QGraphicsWebView>
#include "declarativewebview/qdeclarativewebview_p.h"

class Extensions : public QObject {

    Q_OBJECT

    public:
        explicit Extensions(QDeclarativeWebView *webView = 0);

    protected slots:
        void attachExtensions();

    private:
        QWebFrame *m_frame;
        QMap<QString, QObject *> m_extensions;
};

#endif // EXTENSIONS_H
