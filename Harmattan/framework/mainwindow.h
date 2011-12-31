#ifndef MAINWINDOW_H
#define MAINWINDOW_H

//#include "webview.h"
#include "declarativewebview/qdeclarativewebview_p.h"

#include <QMainWindow>
#include <QDeclarativeItem>
#include <QGraphicsView>
#include <QWebView>
#include <QGraphicsWebView>

extern QDeclarativeItem *QMLDialog;
extern QDeclarativeItem *QMLGallery;
extern QGraphicsView *QMLView;
extern QDeclarativeItem *QMLWebView;
extern bool portrait;

class Notifier: public QObject
{
    Q_OBJECT

    public:
        Notifier (QObject *parent = 0) : QObject(parent) {}

        Q_INVOKABLE void hideView(bool result);
        Q_INVOKABLE void hideGallery(QString url);
        Q_INVOKABLE void orientationChangeStarting(bool inPortrait);
        Q_INVOKABLE void orientationChangeStarted(bool inPortrait);
        Q_INVOKABLE void orientationChangeFinished(bool inPortrait);

    signals:
        void callBack(const bool &result);
        void pictureChosen(const QString &mode, const QString &url);
};

extern Notifier *notifier;

class MainWindow : public QGraphicsView {

    Q_OBJECT

        Q_PROPERTY(qreal rotationAngle READ rotationAngle WRITE setRotationAngle)

    public:
        explicit MainWindow(QGraphicsScene *parent = 0);
        virtual ~MainWindow();

        void setRotationAngle(qreal angle);
        qreal rotationAngle() const;

    private:
        qreal m_rotationAngle;
};

#endif // MAINWINDOW_H
