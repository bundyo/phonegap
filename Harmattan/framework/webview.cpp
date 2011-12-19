#include "webview.h"
#include "scrollbar.h"
#include "kineticscroll.h"
#include "main.h"
#include "mainwindow.h"

#include <QDebug>
#include <QWebFrame>
#include <QApplication>
#include <QGraphicsScene>
#include <QPropertyAnimation>
#include <QParallelAnimationGroup>
#include <QGraphicsSceneMouseEvent>

#define CLICK_CONSTANT 15
#define TILE_FROZEN_DELAY 20
#define FADE_SCROLL_TIMEOUT 1000
#define MIN_ZOOM_SCALE 0.1
#define MAX_ZOOM_SCALE 6.0

WebView::WebView(QGraphicsItem *parent) :
    QGraphicsWebView(parent),
    hasVerticalScroll(false),
    hasHorizontalScroll(false)
{
    kinetic = new KineticScroll(this);

    verticalScroll = new ScrollBar(Qt::Vertical, this);
    verticalScroll->setBackgroundColor(Qt::transparent);
    verticalScroll->setForegroundColor(Qt::gray);
    verticalScroll->setZValue(1);
    verticalScroll->setOpacity(0.0);

    horizontalScroll = new ScrollBar(Qt::Horizontal, this);
    horizontalScroll->setBackgroundColor(Qt::transparent);
    horizontalScroll->setForegroundColor(Qt::gray);
    horizontalScroll->setZValue(1);
    horizontalScroll->setOpacity(0.0);

    installEventFilter(this);
    setResizesToContents(false);
    setAttribute(Qt::WA_OpaquePaintEvent, true);

    timer.setSingleShot(true);
    fadeScrollTimer.setSingleShot(true);

    QObject::connect(&fadeScrollTimer, SIGNAL(timeout()), this, SLOT(onFadeScrollTimeout()));

    QObject::connect(&timer, SIGNAL(timeout()), this, SLOT(enableContentUpdate()));

    QObject::connect(kinetic, SIGNAL(offsetChanged(const QPoint &)),
                     this, SLOT(moveOffset(const QPoint &)));

    QObject::connect(page()->mainFrame(), SIGNAL(contentsSizeChanged(const QSize &)),
                     this, SLOT(onContentsSizeChanged(const QSize &)));
    QObject::connect(page()->mainFrame(), SIGNAL(initialLayoutCompleted()),
                     this, SLOT(onInitialLayoutCompleted()));

}

QRectF WebView::contentGeometry() const
{
    const QSize &size = page()->mainFrame()->contentsSize();
    return QRectF(x(), y(),
                  size.width() * scale(),
                  size.height() * scale());
}

void WebView::setScrollBarsVisible(bool visible)
{
    if (scrollVisible == visible)
        return;

    scrollVisible = visible;

    QParallelAnimationGroup *result = new QParallelAnimationGroup(this);
    QPropertyAnimation *animation;

    if (hasVerticalScroll) {
        animation = new QPropertyAnimation(verticalScroll, "opacity");
        animation->setDuration(400);
        animation->setStartValue(verticalScroll->opacity());
        animation->setEndValue(visible ? 0.7 : 0);
        result->addAnimation(animation);
    }

    if (hasHorizontalScroll) {
        animation = new QPropertyAnimation(horizontalScroll, "opacity");
        animation->setDuration(400);
        animation->setStartValue(horizontalScroll->opacity());
        animation->setEndValue(visible ? 0.7 : 0);
        result->addAnimation(animation);
    }

    if (hasHorizontalScroll || hasVerticalScroll)
        result->start(QAbstractAnimation::DeleteWhenStopped);
}

bool WebView::isClickPossible(const QPoint &pos)
{
    if (kinetic->isAnimating() || !acceptsClick)
        return false;
    else {
        return abs(pos.x() - pressPos.x()) <= CLICK_CONSTANT
            && abs(pos.y() - pressPos.y()) <= CLICK_CONSTANT;
    }
}

void WebView::setContentPos(const QPointF &pos)
{
    page()->mainFrame()->setScrollPosition(pos.toPoint());
    updateScrollBars();
}

void WebView::updateScrollBars()
{
    const QSizeF &webSize = contentGeometry().size();
    const int &width = portrait ? mainWindow->height() : mainWindow->width();
    const int &height = portrait ? mainWindow->width() : mainWindow->height();

    hasHorizontalScroll = webSize.width() > width;
    hasVerticalScroll = webSize.height() > height;

    if (hasVerticalScroll) {
        verticalScroll->setGeometry(width - 10, 14, 7, height - 28);
        verticalScroll->setValue(y());
        verticalScroll->setPageSize(height);
        verticalScroll->setMaximum(qMin<int>(0, height - webSize.height()));
    }

    if (hasHorizontalScroll) {
        horizontalScroll->setGeometry(14, height - 10, width - 28, 7);
        horizontalScroll->setValue(x());
        horizontalScroll->setPageSize(width);
        horizontalScroll->setMaximum(qMin<int>(0, width - webSize.width()));
    }

    if (hasVerticalScroll || hasHorizontalScroll) {
        setScrollBarsVisible(true);

        fadeScrollTimer.start(FADE_SCROLL_TIMEOUT);
    }
}

void WebView::sendSceneClick(const QPointF &pos)
{
    QGraphicsSceneMouseEvent *event;

    event = new QGraphicsSceneMouseEvent(QEvent::GraphicsSceneMousePress);
    event->setButton(Qt::LeftButton);
    event->setScenePos(pos);
    ignored << event;
    QCoreApplication::postEvent(scene(), event);

    event = new QGraphicsSceneMouseEvent(QEvent::GraphicsSceneMouseRelease);
    event->setButton(Qt::LeftButton);
    event->setScenePos(pos);
    ignored << event;
    QCoreApplication::postEvent(scene(), event);
}

bool WebView::isFrozen() const
{
    return isTiledBackingStoreFrozen();
}

void WebView::setFrozen(bool enabled)
{
    setTiledBackingStoreFrozen(enabled);
}

QPointF WebView::contentPos() const
{
    return QPointF(page()->mainFrame()->scrollPosition().x(), page()->mainFrame()->scrollPosition().y());
}

bool WebView::handleMouseEvent(QGraphicsSceneMouseEvent *e)
{
    if (ignored.removeAll(e))
        return false;

    const QPoint &mousePos = - e->pos().toPoint();
    const QPoint &cPos = contentPos().toPoint();

    if (e->type() == QEvent::GraphicsSceneMousePress) {
        if (e->buttons() != Qt::LeftButton)
            return false;

        acceptsClick = !kinetic->isAnimating();

        kinetic->mousePress(mousePos);

        isDragging = false;

        pressPos = cPos - mousePos;
        scenePressPos = e->scenePos().toPoint();
        return true;
    }

    if (e->type() == QEvent::GraphicsSceneMouseMove) {
        if (!isClickPossible(cPos - mousePos))
            isDragging = true;

        if (isDragging) {
            kinetic->mouseMove(mousePos);
        } else {
            kinetic->mousePress(mousePos);
        }
        return true;
    }

    if (e->type() == QEvent::GraphicsSceneMouseRelease) {
        if (isClickPossible(cPos - mousePos)) {
            kinetic->stop();
            sendSceneClick(scenePressPos);
        } else {
            kinetic->mouseRelease(mousePos);
        }

        acceptsClick = true;
        return true;
    }

    return false;
}

void WebView::moveOffset(const QPoint &value)
{
    const QPoint &oldPos = contentPos().toPoint();
    setContentPos(contentPos() + value);

    if (contentPos().toPoint() == oldPos)
        kinetic->stop();

    setFrozen(true);
    timer.start(TILE_FROZEN_DELAY);
}

bool WebView::eventFilter(QObject *object, QEvent *e)
{
    switch(e->type()) {
        case QEvent::GraphicsSceneMousePress:
        case QEvent::GraphicsSceneMouseMove:
        case QEvent::GraphicsSceneMouseRelease:
        case QEvent::GraphicsSceneMouseDoubleClick:
            return handleMouseEvent(static_cast<QGraphicsSceneMouseEvent *>(e));
        case QEvent::GraphicsSceneContextMenu:
            // ignore native context menu
            return true;
        case QEvent::GraphicsSceneHoverMove:
        case QEvent::GraphicsSceneHoverLeave:
        case QEvent::GraphicsSceneHoverEnter:
            // ignore hover events
            return true;
        default:
            return QObject::eventFilter(object, e);
    }
}

void WebView::enableContentUpdate()
{
    setFrozen(false);
}

void WebView::onInitialLayoutCompleted()
{
    kinetic->stop();
    qDebug() << "initial";
}

void WebView::onContentsSizeChanged(const QSize &newSize)
{
    Q_UNUSED(newSize);
    kinetic->stop();
    qDebug() << "sizeChange";
}

void WebView::geometryChanged(const QRectF &newGeometry,
                                    const QRectF &oldGeometry)
{
    Q_UNUSED(oldGeometry);
    kinetic->stop();
    qDebug() << "geometryChange";
    page()->setPreferredContentsSize(newGeometry.size().toSize());
}

void WebView::onFadeScrollTimeout()
{
    setScrollBarsVisible(false);
}

qreal WebView::zoomScale() const
{
    return scale();
}

void WebView::setZoomScale(qreal value)
{
    value = qBound<qreal>(MIN_ZOOM_SCALE, value, MAX_ZOOM_SCALE);

    if (value != zoomScale()) {
        setScale(value);
    }
}

qreal WebView::width() const
{
    return geometry().width();
}

void WebView::setWidth(qreal value)
{
    if (value != geometry().width()) {
        geometry().setWidth(value);
    }
}

qreal WebView::height() const
{
    return geometry().height();
}

void WebView::setHeight(qreal value)
{
    if (value != geometry().height()) {
        geometry().setHeight(value);
    }
}


