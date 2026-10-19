@isTest
private class ImageViewerControllerTest {

    // -------------------------------------------------------
    // getImageFiles
    // -------------------------------------------------------

    @isTest
    static void shouldReturnImages_WhenLinked() {
        // Given
        Account acc = TestDataFactory.createAccount(true);

        String[] extensions = new String[]{ 'jpg', 'png', 'gif' };
        for (String ext : extensions) {
            ContentVersion cv = TestDataFactory.createContentVersion('Image_' + ext, ext, true);
            cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];
            TestDataFactory.linkContentToRecord(cv.ContentDocumentId, acc.Id);
        }

        // When
        Test.startTest();
        List<ContentVersion> result = ImageViewerController.getImageFiles(acc.Id);
        Test.stopTest();

        // Then
        Assert.areEqual(3, result.size(), 'jpg / png / gif の 3 件が返されること');
    }

    @isTest
    static void shouldReturnEmpty_WhenNoFiles() {
        // Given
        Account acc = TestDataFactory.createAccount(true);

        // When
        Test.startTest();
        List<ContentVersion> result = ImageViewerController.getImageFiles(acc.Id);
        Test.stopTest();

        // Then
        Assert.areEqual(0, result.size(), 'ファイルがない場合は空リストが返されること');
    }

    @isTest
    static void shouldExcludeNonImages_WhenPdfLinked() {
        // Given
        Account acc = TestDataFactory.createAccount(true);
        ContentVersion cv = TestDataFactory.createContentVersion('Document', 'pdf', true);
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];
        TestDataFactory.linkContentToRecord(cv.ContentDocumentId, acc.Id);

        // When
        Test.startTest();
        List<ContentVersion> result = ImageViewerController.getImageFiles(acc.Id);
        Test.stopTest();

        // Then
        Assert.areEqual(0, result.size(), 'PDF は除外され空リストが返されること');
    }

    @isTest
    static void shouldReturnOnlyImages_WhenMixedFiles() {
        // Given
        Account acc = TestDataFactory.createAccount(true);

        ContentVersion jpg = TestDataFactory.createContentVersion('Photo', 'jpg', true);
        jpg = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :jpg.Id];
        TestDataFactory.linkContentToRecord(jpg.ContentDocumentId, acc.Id);

        ContentVersion pdf = TestDataFactory.createContentVersion('Report', 'pdf', true);
        pdf = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :pdf.Id];
        TestDataFactory.linkContentToRecord(pdf.ContentDocumentId, acc.Id);

        // When
        Test.startTest();
        List<ContentVersion> result = ImageViewerController.getImageFiles(acc.Id);
        Test.stopTest();

        // Then
        Assert.areEqual(1, result.size(), 'jpg のみ 1 件返されること');
        Assert.areEqual('jpg', result[0].FileExtension, '返されたファイルの拡張子が jpg であること');
    }

    // -------------------------------------------------------
    // deleteFile
    // -------------------------------------------------------

    @isTest
    static void shouldDeleteFile_WhenValidId() {
        // Given
        ContentVersion cv = TestDataFactory.createContentVersion('ToDelete', 'jpg', true);
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];
        Id docId = cv.ContentDocumentId;

        // When
        Test.startTest();
        ImageViewerController.deleteFile(docId);
        Test.stopTest();

        // Then
        List<ContentDocument> remaining = [SELECT Id FROM ContentDocument WHERE Id = :docId];
        Assert.areEqual(0, remaining.size(), 'ContentDocument が削除されていること');
    }

    @isTest
    static void shouldHandleGracefully_WhenNullId() {
        // Given / When / Then — null ID でも例外が発生しないこと
        Test.startTest();
        try {
            ImageViewerController.deleteFile(null);
            Assert.isTrue(true, 'null ID でも例外なく処理されること');
        } catch (Exception e) {
            Assert.fail('null ID で予期しない例外が発生: ' + e.getMessage());
        }
        Test.stopTest();
    }
}
