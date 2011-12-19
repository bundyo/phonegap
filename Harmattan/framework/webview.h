#ifndef WEBVIEW_H
#define WEBVIEW_H

#include "scrollbar.h"
#include "kineticscroll.h"

#include <QTimer>
#include <QGraphicsWebView>

class WebView : public QGraphicsWebView
{
    Q_OBJECT

    Q_PROPERTY(bool frozen READ isFrozen WRITE setFrozen)
    Q_PROPERTY(qreal zoomScale READ zoomScale WRITE setZoomScale)

public:
    explicit WebView(QGraphicsItem *parent = 0);

    bool isFrozen() const;
    void setFrozen(bool enabled);

    qreal zoomScale() const;
    void setZoomScale(qreal value);

    qreal width() const;
    void setWidth(qreal value);

    qreal height() const;
    void setHeight(qreal value);

    void setContentPos(const QPointF &pos);

signals:

public slots:
    void onContentsSizeChanged(const QSize &newSize);

protected slots:
    void moveOffset(const QPoint &offset);
    void enableContentUpdate();
    void onFadeScrollTimeout();
    void onInitialLayoutCompleted();

protected:
    bool eventFilter(QObject *object, QEvent *e);
    bool handleMouseEvent(QGraphicsSceneMouseEvent *e);
    void geometryChanged(const QRectF &newGeometry,
                         const QRectF &oldGeometry);

    KineticScroll *kinetic;

    ScrollBar *verticalScroll;
    ScrollBar *horizontalScroll;

    bool isDragging;
    bool acceptsClick;
    bool hasVerticalScroll;
    bool hasHorizontalScroll;
    QPoint pressPos;
    QPoint scenePressPos;
    QList<QEvent *> ignored;

    QTimer timer;
    bool scrollVisible;
    QTimer fadeScrollTimer;

    void init();
    void updateScrollBars();
    QRectF contentGeometry() const;
    QPointF contentPos() const;
    void sendSceneClick(const QPointF &pos);
    bool isClickPossible(const QPoint &pos);
    void setScrollBarsVisible(bool visible);

};

#endif // WEBVIEW_H
