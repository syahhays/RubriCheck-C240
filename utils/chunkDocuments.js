// utils/chunkDocuments.js

function chunkDocument(text, documentType, fileName, submissionId) {

    // remove empty spaces
    const cleanedText = text.replace(/\r/g, "").trim();

    // split into sections
    let sections = cleanedText
        .split(/\n(?=\d+\.\s)/)
        .filter(section => section.trim() !== "");

    if (sections.length === 0 && cleanedText) {
        sections = [cleanedText];
    }

    return sections.map((section, index) => ({
        id: `${submissionId}::${documentType}::${index + 1}`,
        text: section.trim(),
        metadata: {
            submissionId,
            documentType,
            sectionName: `Section ${index + 1}`,
            fileName,
            chunkIndex: index + 1
        }
    }));

}

module.exports = {
    chunkDocument
};
