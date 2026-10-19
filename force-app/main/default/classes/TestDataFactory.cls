@isTest
public class TestDataFactory {

    public static Account createAccount(Boolean doInsert) {
        Account acc = new Account(Name = 'Test Account');
        if (doInsert) insert acc;
        return acc;
    }

    public static ContentVersion createContentVersion(
        String title,
        String extension,
        Boolean doInsert
    ) {
        ContentVersion cv = new ContentVersion(
            Title           = title,
            PathOnClient    = title + '.' + extension,
            VersionData     = Blob.valueOf('test content'),
            IsMajorVersion  = true
        );
        if (doInsert) insert cv;
        return cv;
    }

    public static ContentDocumentLink linkContentToRecord(
        Id contentDocumentId,
        Id linkedEntityId
    ) {
        ContentDocumentLink cdl = new ContentDocumentLink(
            ContentDocumentId = contentDocumentId,
            LinkedEntityId    = linkedEntityId,
            ShareType         = 'V',
            Visibility        = 'AllUsers'
        );
        insert cdl;
        return cdl;
    }
}
