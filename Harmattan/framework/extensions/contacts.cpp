#include "contacts.h"
#include <QDebug>
#include <QContactName>
#include <QContactDetail>
#include <QContactAddress>
#include <QContactPhoneNumber>
#include <QContactEmailAddress>
#include <QContactIntersectionFilter>
#include <QContactUnionFilter>
#include <QContactDetailFilter>

Contacts::Contacts(QObject *parent) :
    QObject(parent),
    m_contactFetchRequest() {

    m_contacts = new QContactManager(this);

//    connect(m_contactFetchRequest, SIGNAL(stateChanged(QContactAbstractRequest::State)), this, SLOT(contactFetchRequestStateChanged(QContactAbstractRequest::State)));

//    m_contactFetchRequest.setManager(m_contacts);

//    QVariantMap map;
//    map["displayName"] = "DisplayLabel";
//    map["name"] = QStringList(QContactName::FieldPrefix) << QContactName::FieldFirstName << QContactName::FieldLastName;
//    map["name.formatted"] = map["name"];
//    map["name.givenName"] = QStringList(QContactName::FieldFirstName);
//    map["name.familyName"] = QStringList(QContactName::FieldLastName);
//    map["name.honorificPrefix"] = QStringList(QContactName::FieldPrefix);
//    map["phoneNumbers"] = QStringList(QContactPhoneNumber::FieldNumber);
//    map["phoneNumbers.value"] = QStringList(QContactPhoneNumber::FieldNumber);
//    map["emails"] = QStringList(QContactEmailAddress::FieldEmailAddress);
//    map["addresses"] = QStringList(QContactAddress::FieldStreet) << QContactAddress::FieldRegion << QContactAddress::FieldPostOfficeBox << QContactAddress::FieldPostcode << QContactAddress::FieldLocality << QContactAddress::FieldCountry;
//    map["addresses.formatted"] = map["addresses"];
//    map["addresses.streetAddress"] = QStringList(QContactAddress::FieldStreet);
//    map["addresses.region"] = QStringList(QContactAddress::FieldRegion);
//    map["addresses.locality"] = QStringList(QContactAddress::FieldLocality);
//    map["addresses.country"] = QStringList(QContactAddress::FieldCountry);
//    map["organizations"] = QStringList("Name") << "Department" << "Title";
//    map["organizations.name"] = "Organization";
//    map["organizations.department"] = "Department";
//    map["organizations.title"] = "Title";
//    map["birthday"] = "Birthday";
//    map["anniversary"] = "Anniversary";
//    map["nickname"] = "Nickname";
//    map["note"] = "Note";
//    map["urls"] = "Url";
//    map["urls.value"] = "Url";

//    qDebug() << map;
}

QVariantMap Contacts::findContacts(QVariantMap fields, QString filter, bool multiple) const {

    QContactIntersectionFilter currentFilter = QContactIntersectionFilter();

    QContactUnionFilter nameFilter;
    QStringList nameFields;
    nameFields << QContactName::FieldCustomLabel;
    nameFields << QContactName::FieldFirstName;
    nameFields << QContactName::FieldLastName;
    nameFields << QContactName::FieldMiddleName;
    nameFields << QContactName::FieldPrefix;
    nameFields << QContactName::FieldSuffix;
    foreach (const QString& fieldName, nameFields) {
        QContactDetailFilter subFilter;
        subFilter.setDetailDefinitionName(QContactName::DefinitionName, fieldName);
        subFilter.setValue("test");
        subFilter.setMatchFlags(QContactFilter::MatchContains);
        nameFilter.append(subFilter);
    }
    currentFilter.append(nameFilter);

    qDebug() << fields;

//    QList<QContact> result = m_contacts->contacts(currentFilter);

//    qDebug() << result;

    QVariantMap map;
    map["name"] = "Test";
    return map;
}

void Contacts::contactFetchRequestStateChanged(QContactAbstractRequest::State newState) {

}
