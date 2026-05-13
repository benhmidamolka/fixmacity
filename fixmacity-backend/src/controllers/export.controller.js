const PDFDocument = require('pdfkit');
const supabase = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.exportDeclaration = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl, error } = await supabase
      .from('declarations')
      .select('*, users!citizen_id(first_name, last_name, email), services!department_id(name_fr)')
      .eq('id', id)
      .single();

    if (error || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    const doc = new PDFDocument({ margin: 50 });
    let filename = `Declaration_${decl.ref_citoyen || decl.id}.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    // Header
    doc.fillColor('#2c3e50').fontSize(20).text('FixMaCity - Rapport de Signalement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Référence: ${decl.ref_citoyen || 'N/A'}`, { align: 'right' });
    doc.text(`Date: ${new Date(decl.created_at).toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown();

    // Horizontal line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#bdc3c7');
    doc.moveDown();

    // Details
    doc.fillColor('#2c3e50').fontSize(14).text('Informations Générales', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#34495e').fontSize(12);
    doc.text(`Titre: ${decl.title}`);
    doc.text(`Statut: ${decl.status.toUpperCase()}`);
    doc.text(`Catégorie: ${decl.category || 'N/A'}`);
    doc.text(`Priorité: ${decl.priority || 'moyenne'}`);
    doc.moveDown();

    doc.fillColor('#2c3e50').fontSize(14).text('Description', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#34495e').fontSize(12).text(decl.description);
    doc.moveDown();

    doc.fillColor('#2c3e50').fontSize(14).text('Localisation', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#34495e').fontSize(12).text(`Adresse: ${decl.address || 'N/A'}`);
    doc.text(`Coordonnées: ${decl.latitude}, ${decl.longitude}`);
    doc.moveDown();

    if (decl.users) {
      doc.fillColor('#2c3e50').fontSize(14).text('Citoyen', { underline: true });
      doc.moveDown(0.5);
      doc.fillColor('#34495e').fontSize(12).text(`Nom: ${decl.users.first_name} ${decl.users.last_name}`);
      doc.text(`Email: ${decl.users.email}`);
    }

    doc.end();
    doc.pipe(res);

  } catch (err) {
    console.error('[Export] PDF error:', err);
    return res.status(500).json({ error: 'Erreur lors de la génération du PDF.' });
  }
};
