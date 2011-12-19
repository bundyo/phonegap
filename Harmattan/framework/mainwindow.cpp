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
#include <QGraphicsWebView>
#include <QPropertyAnimation>
#include <QParallelAnimationGroup>

#ifdef Q_OS_UNIX
#include <QX11Info>
#include <X11/Xatom.h>
#include <X11/Xlib.h>
#endif

QDeclarativeItem *QMLDialog;
QDeclarativeItem *QMLGallery;
QGraphicsView *QMLView;
Notifier *notifier;
WebView *webView;
bool portrait;

static void writeX11OrientationAngleProperty(QWidget* widget, ScreenOrientation orientation = Portrait)
{
#ifdef Q_WS_X11
    if (widget) {
        WId id = widget->winId();
        Display *display = QX11Info::display();
        if (!display) return;
        Atom orientationAngleAtom = XInternAtom(display, "_MEEGOTOUCH_ORIENTATION_ANGLE", False);
        XChangeProperty(display, id, orientationAngleAtom, XA_CARDINAL, 32, PropModeReplace, (unsigned char*)&orientation, 1);
    }
#endif
}

void Notifier::hideView(bool result) {
    qDebug() << QMLDialog->property("titleText");
    QMLView->hide();

//    emit callBack(result);
}

void Notifier::hideGallery(QString url) {
    qDebug() << url;
    QMLView->hide();

    emit pictureChosen("still-capture", url);
}

void Notifier::orientationChangeStarting(bool inPortrait) {
    qDebug() << "orientation change starting";

    webView->setFrozen(true);

    QPropertyAnimation *animation = new QPropertyAnimation(mainWindow, "rotationAngle");
    animation->setDuration(0);                      // Set to number of milliseconds to enable animation. However, its rather choppy.
    animation->setStartValue(inPortrait ? -90 : 0);
    animation->setEndValue(inPortrait ? 0 : -90);
    QObject::connect(animation, SIGNAL(finished()), this, SLOT(animationFinished()));

    portrait = !inPortrait;
    mainWindow->setTransformationAnchor(QGraphicsView::NoAnchor);

    animation->start(QAbstractAnimation::DeleteWhenStopped);
}

void Notifier::animationFinished() {
    if (portrait) {
        writeX11OrientationAngleProperty(mainWindow, Portrait);
        webView->setGeometry(QRectF(0,0,480,854));
    } else {
        writeX11OrientationAngleProperty(mainWindow, Landscape);
        webView->setGeometry(QRectF(0,0,854,480));
    }

    webView->setFrozen(false);

    // Force WebKit redraw due to artifacts. I really hope there's a better way.
    webView->page()->mainFrame()->evaluateJavaScript("document.documentElement.style.webkitTransform = 'scale(1)';");
    webView->page()->mainFrame()->evaluateJavaScript("document.documentElement.style.webkitTransform = 'none';");
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
    setOptimizationFlags(QGraphicsView::DontSavePainterState);
    setViewportUpdateMode(QGraphicsView::BoundingRectViewportUpdate);
    setCacheMode( QGraphicsView::CacheBackground );
    setBackgroundBrush(QBrush(Qt::black, Qt::SolidPattern));

    QDir templateDir = QApplication::applicationDirPath();
    templateDir.cdUp();
    templateDir.cd("app");

    qDebug() << "Loading file: " << templateDir.filePath("index.html");

    QGraphicsScene *scene = new QGraphicsScene;
    QDeclarativeEngine *engine = new QDeclarativeEngine;
    QDeclarativeComponent component(engine, QUrl::fromLocalFile(QApplication::applicationDirPath() + QLatin1String("/../qml/empty.qml")));

    notifier = new Notifier();
    QObject *comp = component.create();
    QMLDialog = comp->findChild<QDeclarativeItem*>("dialog");
    QMLGallery = comp->findChild<QDeclarativeItem*>("gallery");
    engine->rootContext()->setContextProperty("notifier", notifier);

    QWebSettings::globalSettings()->setAttribute(QWebSettings::TiledBackingStoreEnabled, true);
    webView = new WebView();
    webView->setPage(new WebPage());
    webView->setGeometry(QRectF(0,0,854,480));

    portrait = !QMLDialog->property("inPortrait").toBool();

    webView->page()->settings()->setAttribute(QWebSettings::LocalContentCanAccessRemoteUrls, true);
    webView->page()->settings()->setAttribute(QWebSettings::LocalContentCanAccessFileUrls, true);
    webView->page()->settings()->setAttribute(QWebSettings::LocalStorageEnabled, true);
    webView->page()->settings()->setAttribute(QWebSettings::LocalStorageDatabaseEnabled, true);
    webView->page()->settings()->setAttribute(QWebSettings::AcceleratedCompositingEnabled, true);
    webView->page()->settings()->setAttribute(QWebSettings::DnsPrefetchEnabled, true);
    webView->page()->settings()->setAttribute(QWebSettings::OfflineStorageDatabaseEnabled, true);
    webView->page()->settings()->setAttribute(QWebSettings::OfflineWebApplicationCacheEnabled, true);
    webView->settings()->enablePersistentStorage();
    webView->load(QUrl::fromUserInput(templateDir.filePath("index.html")));
    webView->page()->mainFrame()->setScrollBarPolicy( Qt::Vertical, Qt::ScrollBarAlwaysOff );
    webView->page()->mainFrame()->setScrollBarPolicy( Qt::Horizontal, Qt::ScrollBarAlwaysOff );

    mainScene->addItem(webView);
    mainScene->setActiveWindow(webView);

    new Extensions(webView);

    scene->addItem(qobject_cast<QGraphicsItem*>(comp));
    scene->setItemIndexMethod(QGraphicsScene::NoIndex);

    QMLView = new QGraphicsView( this );
    QMLView->setScene( scene );
    QMLView->resize(width(),height());
    QMLView->setStyleSheet( "background: transparent; border: none;" );
    QMLView->setOptimizationFlags(QGraphicsView::DontSavePainterState);
    QMLView->setViewportUpdateMode(QGraphicsView::BoundingRectViewportUpdate);
    QMLView->setVerticalScrollBarPolicy( Qt::ScrollBarAlwaysOff );
    QMLView->setHorizontalScrollBarPolicy( Qt::ScrollBarAlwaysOff );
    QMLView->setCacheMode( QGraphicsView::CacheBackground );
    QMLView->setFrameShape(QFrame::NoFrame);

    webView->page()->mainFrame()->evaluateJavaScript("window._nativeReady = true"); // Tell PhoneGap that init is complete.
}

MainWindow::~MainWindow() {
}

qreal MainWindow::rotationAngle() const
{
    return m_rotationAngle;
}

void MainWindow::setRotationAngle(qreal angle)
{
    if (m_rotationAngle != angle) {
        m_rotationAngle = angle;
        QTransform t;
        t.rotate(m_rotationAngle, Qt::ZAxis);
        setTransform(t);
    }
}
