/*
 * Camera.cpp
 *
 *  Created on: Jan 15, 2010
 *      Author: nitobi-test
 */

#include "camera.h"
#include "mainwindow.h"

#include <QDebug>

#include <QBuffer>
#include <QFile>
#include <QImage>
#include <QImageReader>

// default size for captured picture (applies to base64 encoded format only)
const int MAX_IMG_WIDTH = 1024;
const int MAX_IMG_HEIGHT = 768;

Camera::Camera(QObject *parent) :
    QObject(parent),
    m_waitingForPicture(false),
    m_destination(EDestinationDataUrl),
    m_encoding(JPEG),
    m_interface(0),
    m_quality(75),
    m_size(MAX_IMG_WIDTH, MAX_IMG_HEIGHT) {

    m_interface = new CameraInterface();
    connect(notifier, SIGNAL(pictureChosen(QString,QString)), this, SLOT(onCaptureCompleted(QString,QString)));
    connect(m_interface, SIGNAL(captureCompleted(QString,QString)), this, SLOT(onCaptureCompleted(QString,QString)));
}

int Camera::destinationType() const {

    return m_destination;
}

void Camera::setDestinationType(int destination) {

    if (destination != EDestinationDataUrl && destination != EDestinationFileUri) {
        qDebug() << "Camera::setDestinationType: invalid value: " << destination;
        return;
    }

    m_destination = destination;
}

int Camera::quality() const {

    return m_quality;
}

void Camera::setQuality(int quality) {

    if (quality < 0 || quality > 100) {
        qDebug() << "Camera::setQuality: value out of range: " << quality;
        return;
    }

    m_quality = quality;
}

int Camera::width() const {

    return m_size.width();
}

void Camera::setWidth(int width) {

    m_size.setWidth(width);
}

int Camera::height() const {

    return m_size.height();
}

void Camera::setHeight(int height) {

    m_size.setHeight(height);
}

int Camera::encodingType() const {

    return m_encoding;
}

void Camera::setEncodingType(int encoding) {
    if (encoding != JPEG && encoding != PNG) {
        qDebug() << "setEncoding: invalid value: " << encoding;
        return;
    }

    m_encoding = encoding;
}

void Camera::takePicture(int quality, int destinationType, int sourceType, int targetWidth, int targetHeight, int encodingType) {

    setQuality(quality);
    setWidth(targetWidth);
    setHeight(targetHeight);
    setDestinationType(destinationType);
    setEncodingType(encodingType);

    m_waitingForPicture = true;
    if (sourceType == CAMERA) {
        qDebug() << "Camera::takePicture: Starting camera app";
        m_interface->showCamera("still-capture");
    } else {
        qDebug() << "Camera::takePicture: Show Gallery";
        if (QMLGallery) {
            QMLGallery->setProperty( "camera", sourceType == PHOTOLIBRARY ? false : true );
            QMetaObject::invokeMethod(QMLGallery, "open");
        }
    }
}

void Camera::onCaptureCompleted(const QString &mode, const QString &fileName) {
    if (!m_waitingForPicture) {
        return;
    }

    if (mode != "still-capture") {
        qDebug() << "Video captured: " << fileName << " (can handle images only)";
        emit error(EVideoFileCaptured, "A video was captured (can handle images only)");
        return;
    }

    qDebug() << "File captured: " << fileName;

    if (m_destination == EDestinationFileUri) {
        emit pictureCaptured(fileName);
        return;
    } else {

    }

    m_waitingForPicture = false;

    QImageReader reader(fileName);
    QSize maxSize(MAX_IMG_WIDTH, MAX_IMG_HEIGHT);
    QSize imgSize(reader.size());
    if (imgSize.width() > imgSize.height()) { // landscape/portrait format?
        maxSize.transpose();
    }
    if (imgSize.width() > maxSize.width() || imgSize.height() > maxSize.height()) { // scale image if necessary
        imgSize.scale(maxSize, Qt::KeepAspectRatio);
        reader.setScaledSize(imgSize);
    }

    QImage *img = new QImage();
    if (!reader.read(img)) {
        delete img;
        qDebug() << "Failed to read captured file: " << reader.errorString() << " (" << reader.error() << ")";
        emit error(ECaptureFileNotReadable, "Failed to open/read captured file: " + reader.errorString());
        return;
    }

    QByteArray data;
    QBuffer buffer(&data);
    buffer.open(QIODevice::WriteOnly);
    img->save(&buffer, m_encoding == 0 ? "JPG" : "PNG", m_quality);
    buffer.close();
    delete img;
    emit pictureCaptured(data.toBase64());
}
