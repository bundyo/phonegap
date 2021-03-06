#include "extensions.h"
#include "main.h"
#include "mainwindow.h"
#include "webpage.h"

#include <QDebug>
#include <QWidget>
#include <QtGui/QApplication>
#include <QDir>
#include <QRectF>
#include <QGraphicsScene>
#include <QDeclarativeComponent>
#include <QDeclarativeContext>
#include <QDeclarativeEngine>
#include <QWebSettings>
#include <QWebFrame>

#ifdef Q_OS_UNIX
#include <QX11Info>
#include <X11/Xatom.h>
#include <X11/Xlib.h>
#endif

QDeclarativeItem *QMLDialog;
QDeclarativeItem *QMLGallery;
QGraphicsView *QMLView;
QDeclarativeItem *QMLWebView;
Notifier *notifier;

void Notifier::hideView(bool result) {
    qDebug() << QMLDialog->property("titleText");
    QMetaObject::invokeMethod(QMLDialog, "close");

//    emit callBack(result);
}

void Notifier::hideGallery(QString url) {
    qDebug() << url;
    QMetaObject::invokeMethod(QMLGallery, "close");

    emit pictureChosen("still-capture", url);
}

void Notifier::orientationChangeStarting(bool inPortrait) {
    qDebug() << "orientation change starting";
}

void Notifier::orientationChangeStarted(bool inPortrait) {
    qDebug() << "orientation change started";
}

void Notifier::orientationChangeFinished(bool inPortrait) {
    qDebug() << "orientation change finished";
}

MainWindow::MainWindow(QGraphicsScene *parent) :
    QGraphicsView(parent) {

    QGraphicsScene *mainScene = new QGraphicsScene;
    setScene(mainScene);
    setFrameShape(QFrame::NoFrame);
    setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setViewportUpdateMode(QGraphicsView::BoundingRectViewportUpdate);
    setCacheMode( QGraphicsView::CacheBackground );
    setAttribute(Qt::WA_TranslucentBackground, false);
    setBackgroundBrush(QBrush(Qt::black, Qt::SolidPattern));

    QDir templateDir = QApplication::applicationDirPath();
    templateDir.cdUp();
    templateDir.cd("app");

    qDebug() << "Loading file: " << templateDir.filePath("index.html");

    QGraphicsScene *scene = new QGraphicsScene;
    QDeclarativeEngine *engine = new QDeclarativeEngine;
    QDeclarativeComponent component(engine, QUrl::fromLocalFile(QApplication::applicationDirPath() + QLatin1String("/../qml/browser.qml")));
    qDebug() << component.errors();

    notifier = new Notifier();
    QObject *comp = component.create();
    QMLDialog = comp->findChild<QDeclarativeItem*>("dialog");
    QMLGallery = comp->findChild<QDeclarativeItem*>("gallery");
    QMLWebView = comp->findChild<QDeclarativeItem*>("webView");
    engine->rootContext()->setContextProperty("notifier", notifier);

    ((QDeclarativeWebView*) QMLWebView)->setPage(new WebPage());
    QMLWebView->setProperty("pageUrl", "../app/index.html");
    ((QDeclarativeWebView*) QMLWebView)->page()->settings()->setAttribute(QWebSettings::LocalStorageEnabled, true);
    ((QDeclarativeWebView*) QMLWebView)->page()->settings()->setAttribute(QWebSettings::LocalStorageDatabaseEnabled, true);
    ((QDeclarativeWebView*) QMLWebView)->page()->settings()->setAttribute(QWebSettings::AcceleratedCompositingEnabled, true);
    ((QDeclarativeWebView*) QMLWebView)->page()->settings()->setAttribute(QWebSettings::TiledBackingStoreEnabled, true);
    ((QDeclarativeWebView*) QMLWebView)->settings()->enablePersistentStorage();
    QMLWebView->setCacheMode(QGraphicsItem::DeviceCoordinateCache);

    new Extensions(((QDeclarativeWebView*) QMLWebView));

    scene->addItem(qobject_cast<QGraphicsItem*>(comp));
    scene->setSceneRect(0,0,width(),height());
    scene->setItemIndexMethod(QGraphicsScene::NoIndex);

    QMLView = new QGraphicsView( this );
    QMLView->setScene( scene );
    QMLView->setGeometry(0,0,width(),height());
    QMLView->setStyleSheet( "background: transparent; border: none;" );
    QMLView->setViewportUpdateMode(QGraphicsView::BoundingRectViewportUpdate);
    QMLView->setVerticalScrollBarPolicy( Qt::ScrollBarAlwaysOff );
    QMLView->setHorizontalScrollBarPolicy( Qt::ScrollBarAlwaysOff );
    QMLView->setCacheMode( QGraphicsView::CacheBackground );
    QMLView->setFrameShape(QFrame::NoFrame);

    ((QDeclarativeWebView*) QMLWebView)->page()->mainFrame()->evaluateJavaScript("window._nativeReady = true"); // Tell PhoneGap that init is complete.
}

MainWindow::~MainWindow() {
}
