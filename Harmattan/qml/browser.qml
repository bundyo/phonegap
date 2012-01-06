import QtQuick 1.0
import com.nokia.meego 1.0
import QtMobility.gallery 1.1
import QtWebKit 1.0

Window {
    id: appWindow
    objectName: "appWindow"
    color: "black"

    Flickable {
        id: flickable
        width: parent.width
        height: parent.height
        clip: true
        contentWidth: Math.max(flickable.width,webView.width)
        contentHeight: Math.max(flickable.height,webView.height)
        pressDelay: 100

        WebView {
            property string pageUrl

            id: webView
            objectName: "webView"
            transformOrigin: Item.TopLeft
            smooth: false
            preferredWidth: flickable.width
            preferredHeight: flickable.height
            contentsScale: 1
            settings.localContentCanAccessRemoteUrls: true
            settings.localStorageDatabaseEnabled: true
            settings.offlineStorageDatabaseEnabled: true
            settings.offlineWebApplicationCacheEnabled: true
            settings.javascriptCanAccessClipboard: true
            url: pageUrl
            onContentsSizeChanged: {
                contentsScale = Math.min(1,flickable.width / contentsSize.width)
            }
        }
    }
    ScrollDecorator {
        id: decorator
        flickableItem: flickable
    }

    onOrientationChangeAboutToStart: notifier.orientationChangeStarting(appWindow.inPortrait);
    onOrientationChangeStarted: notifier.orientationChangeStarted(appWindow.inPortrait);
    onOrientationChangeFinished: notifier.orientationChangeFinished(appWindow.inPortrait);

    Dialog {
        property string titleText
        property string contentText
        property string button1Text
        property string button2Text
        property bool button1Visible
        property bool button2Visible
        property bool state
        property bool inPortrait: appWindow.inPortrait

        id: dialog
        width: parent.width
        height: parent.height
        objectName: "dialog"
        title: Rectangle {
            id: topTitle
            height: 30
            color: "transparent"
            width: parent.width
            Text {
                font.pixelSize: 30
                font.bold: true
                anchors.centerIn: parent
                color: "white"
                text: dialog.titleText
            }
        }

        content:Item {
            id: name
            height: 50
            width: parent.width
            Text {
                font.pixelSize: 22
                anchors.centerIn: parent
                color: "white"
                text: dialog.contentText
            }
        }

        buttons: ButtonRow {
            style: ButtonStyle { }
            anchors.horizontalCenter: parent.horizontalCenter
            Button {
                visible: dialog.button1Visible
                text: dialog.button1Text;
                onClicked: {
                    dialog.state = true
                    dialog.accept();
                }
            }
            Button {
                visible: dialog.button2Visible
                text: dialog.button2Text;
                onClicked: {
                    dialog.state = false
                    dialog.reject();
                }
            }
        }

        onStatusChanged: {
            if (dialog.status == DialogStatus.Closed)
                hider.start();
        }

        Timer {
            id: hider
            interval: 200; running: false;
            onTriggered: notifier.hideView(dialog.state);
        }

    }

    Dialog {
        property bool camera
        property string chosen: ""

        id: galleryDialog
        objectName: "gallery"
        width: parent.width
        height: parent.height

        content: GridView {
            id: gallery
            width: galleryDialog.width
            height: galleryDialog.height
            cellWidth: appWindow.inPortrait ? appWindow.height / 3 : appWindow.width / 5.05
            cellHeight: cellWidth

            model: DocumentGalleryModel {
                rootType: DocumentGallery.Image
                scope: "DirectDescendants"
                properties: [ "url", "dateTaken", "fileName", "filePath" ] // "lastModified", "title",
                sortProperties: [ "-dateTaken" ]

                filter: galleryDialog.camera ? containsFilter : wildcardFilter
            }

            delegate: Image {
                asynchronous: true
                smooth: false
                source: "file:///home/user/.thumbnails/grid/" + Qt.md5(url) + ".jpeg"
                width: gallery.cellWidth
                height: gallery.cellHeight
                MouseArea {
                    id: mouseArea
                    anchors.fill: parent
                    onClicked: {
                        galleryDialog.chosen = url;
                        galleryDialog.close();
                    }
                }
            }

            GalleryFilterUnion {
                id: wildcardFilter
                filters: [
                    GalleryWildcardFilter {
                        property: "fileName";
                        value: "*.jpg";
                    },
                    GalleryWildcardFilter {
                        property: "fileName";
                        value: "*.png";
                    }
                ]
            }

            GalleryContainsFilter {
                id: containsFilter
                property: "filePath"
                value: "DCIM"
            }

            ScrollDecorator {
                id: galleryDecorator
                flickableItem: gallery
            }
        }

        onStatusChanged: {
            if (galleryDialog.status == DialogStatus.Closed)
                hider2.start();
        }

        Timer {
            id: hider2
            interval: 200; running: false;
            onTriggered: {
                if (galleryDialog.chosen != "")
                    notifier.hideGallery(galleryDialog.chosen);
                galleryDialog.chosen = "";
            }
        }
    }
}
