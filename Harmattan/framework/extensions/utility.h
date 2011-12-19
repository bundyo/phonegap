#ifndef UTILITY_H
#define UTILITY_H

#include <QObject>
#include <QWebHistory>

class Utility : public QObject {

    Q_OBJECT

    public:
        explicit Utility(QObject *parent = 0);

        Q_INVOKABLE void cancelLoadUrl();
        Q_INVOKABLE void clearCache();
        Q_INVOKABLE void loadUrl(QString url, QString loadingDialog, bool clearHistory, bool openExternal);
        Q_INVOKABLE void clearHistory();
        Q_INVOKABLE void backHistory();
        Q_INVOKABLE void exit();
};

#endif // UTILITY_H
