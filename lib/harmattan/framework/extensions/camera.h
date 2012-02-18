/*
 * Camera.h
 *
 *  Created on: Jan 15, 2010
 *      Author: nitobi-test
 */

#ifndef CAMERA_H
#define CAMERA_H

#include "maemo-meegotouch-interfaces/camerainterface.h"

#include <QObject>
#include <QSize>

//class QImage;

class Camera: public QObject {

    Q_OBJECT

    public:
        Camera(QObject *parent = 0);

        /**
         * Error codes passed with the error signal
         */
        enum ErrorCodes {
            ENoError = 0,
            ECameraObserverFailed,
            ECameraAppNotFound,
            ECameraAppFailed,
            ECaptureFileNotReadable,
            EVideoFileCaptured,
            EUnknownError
        };

        /**
         * Defines the how the captured picture is returned
         */
        enum EDestinationType {
            EDestinationDataUrl = 0,
            EDestinationFileUri = 1
        };

        enum EPictureSourceType {
            PHOTOLIBRARY = 0,
            CAMERA = 1,
            SAVEDPHOTOALBUM = 2
        };

        enum EEncodingType {
            JPEG = 0,                    // Return JPEG encoded image
            PNG = 1                      // Return PNG encoded image
        };

        Q_INVOKABLE void takePicture(int quality, int destinationType, int sourceType, int targetWidth, int targetHeight, int encodingType);

        /**
         * @Returns in which format a captured picture is returned to js-code
         */
        int destinationType() const;

        /**
         * Define in which format a captured picture is returned to js code
         * @param destination - valid values are defined in EDestinationType (C++) / camera.DestinationType (js)
         */
        void setDestinationType(int destination);

        Q_PROPERTY(int destinationType READ destinationType WRITE setDestinationType)

        /**
         * @Returns the image compression quality for captured pictures
         * @note Only for base64 encoded format, has no effect for EDestinationFileUri
         */
        int quality() const;

        /**
         * Sets the image compression quality for captured pictures
         * @param quality 0 - 100
         */
        void setQuality(int quality);

        Q_PROPERTY(int quality READ quality WRITE setQuality)

        /**
         * @Returns maximum width for the captured picture
         * @note If the picture taken by the camera is larger it will be scaled down (keeping it's aspect ratio)
         * but the picture will not be scaled up if it is smaller.
         * Only applies for base64 encoded format, ignored for EDestinationFileUri
         */
        int width() const;

        /**
         * Sets the maximum width for the captured picture
         * @param width
         */
        void setWidth(int width);

        Q_PROPERTY(int width READ width WRITE setWidth)

        /**
         * @Returns maximum height for the captured picture
         * @note If the picture taken by the camera is larger it will be scaled down (keeping it's aspect ratio)
         * but the picture will not be scaled up if it is smaller.
         * Only applies for base64 encoded format, ignored for EDestinationFileUri
         */
        int height() const;

        /**
         * Sets the maximum height for the captured picture
         * @param height
         */
        void setHeight(int height);
        Q_PROPERTY(int height READ height WRITE setHeight)

        int encodingType() const;
        void setEncodingType(int encoding);
        Q_PROPERTY(int encodingType READ encodingType WRITE setEncodingType)

    signals:
        void pictureCaptured(const QString &data);
        void error(int errorCode, const QString &message);

    private:
        bool m_waitingForPicture;
        int m_destination;
        int m_encoding;
        CameraInterface* m_interface;
        int m_quality;
        QSize m_size;

    private slots:
        void onCaptureCompleted(const QString &mode, const QString &fileName);
};

#endif // CAMERA_H
