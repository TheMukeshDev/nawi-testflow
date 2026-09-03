"""
NAWI TestFlow — PDF Report Generator

Generates professional laboratory test reports using ReportLab.
Designed for technical/metrology reports, NOT marketing materials.

Features:
- Structured sections with clear hierarchy
- Tables for observations and results
- OBSERVED / CALCULATED / LIMIT / RESULT color coding
- Page numbers and headers/footers
- Professional typography
"""

from datetime import datetime, date
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable

from .report_models import (
    TestReport, TestResult, TestProcedure, Observation,
    ReportIdentification, LaboratoryInfo, InstrumentInfo,
    TestConditions, TestEquipment, ComplianceResult,
    Signature, Attachment, ReportMetadata
)


# ============================================================================
# COLOR SCHEME (Professional, not decorative)
# ============================================================================

class ReportColors:
    """Professional color palette for technical reports."""
    
    # Primary
    BLACK = colors.black
    WHITE = colors.white
    
    # Section backgrounds
    HEADER_BG = colors.HexColor("#1a365d")      # Dark blue header
    SECTION_BG = colors.HexColor("#2c5282")      # Medium blue
    SUBSECTION_BG = colors.HexColor("#e2e8f0")   # Light gray-blue
    
    # Table styling
    TABLE_HEADER_BG = colors.HexColor("#2d3748")  # Dark gray
    TABLE_ALT_ROW = colors.HexColor("#f7fafc")    # Very light gray
    TABLE_BORDER = colors.HexColor("#a0aec0")     # Medium gray
    
    # Status colors
    PASS_BG = colors.HexColor("#c6f6d5")          # Light green
    FAIL_BG = colors.HexColor("#fed7d7")          # Light red
    WARNING_BG = colors.HexColor("#fefcbf")       # Light yellow
    
    # Data type indicators
    OBSERVED_BG = colors.HexColor("#ebf8ff")      # Light blue
    CALCULATED_BG = colors.HexColor("#f0fff4")    # Light green
    LIMIT_BG = colors.HexColor("#fff5f5")         # Light red
    RESULT_BG = colors.HexColor("#faf5ff")        # Light purple
    
    # Text
    TEXT_PRIMARY = colors.HexColor("#1a202c")
    TEXT_SECONDARY = colors.HexColor("#4a5568")
    TEXT_LIGHT = colors.HexColor("#718096")


# ============================================================================
# STYLES
# ============================================================================

def create_styles():
    """Create paragraph styles for the report."""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=6*mm,
        textColor=ReportColors.HEADER_BG,
        fontName='Helvetica-Bold',
    ))
    
    styles.add(ParagraphStyle(
        name='ReportSubtitle',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=4*mm,
        textColor=ReportColors.SECTION_BG,
        fontName='Helvetica-Bold',
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=11,
        spaceBefore=6*mm,
        spaceAfter=3*mm,
        textColor=ReportColors.HEADER_BG,
        fontName='Helvetica-Bold',
        borderWidth=1,
        borderColor=ReportColors.HEADER_BG,
        borderPadding=2,
    ))
    
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Heading3'],
        fontSize=10,
        spaceBefore=4*mm,
        spaceAfter=2*mm,
        textColor=ReportColors.SECTION_BG,
        fontName='Helvetica-Bold',
    ))
    
    # BodyText is already defined in default styles, we modify it
    styles['BodyText'].fontSize = 9
    styles['BodyText'].leading = 12
    styles['BodyText'].textColor = ReportColors.TEXT_PRIMARY
    styles['BodyText'].fontName = 'Helvetica'
    
    styles.add(ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=ReportColors.TEXT_SECONDARY,
        fontName='Helvetica',
    ))
    
    styles.add(ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=ReportColors.WHITE,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=ReportColors.TEXT_PRIMARY,
        fontName='Helvetica',
    ))
    
    styles.add(ParagraphStyle(
        name='TableCellCenter',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=ReportColors.TEXT_PRIMARY,
        fontName='Helvetica',
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='Disclaimer',
        parent=styles['Normal'],
        fontSize=7,
        leading=9,
        textColor=ReportColors.TEXT_SECONDARY,
        fontName='Helvetica-Oblique',
    ))
    
    return styles


# ============================================================================
# PDF GENERATOR
# ============================================================================

class ReportPDFGenerator:
    """
    Generates professional PDF test reports using ReportLab.
    
    Output is suitable for laboratory use — structured, dense,
    and focused on data, not decoration.
    """
    
    PAGE_WIDTH, PAGE_HEIGHT = A4
    MARGIN = 2*cm
    
    def __init__(self):
        self.styles = create_styles()
    
    def generate(self, report: TestReport) -> bytes:
        """
        Generate PDF report.
        
        Args:
            report: Complete test report data
            
        Returns:
            PDF file as bytes
        """
        buffer = BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=self.MARGIN,
            rightMargin=self.MARGIN,
            topMargin=self.MARGIN + 1*cm,  # Extra for header
            bottomMargin=self.MARGIN + 1*cm,  # Extra for footer
        )
        
        elements = []
        
        # Build report sections
        elements.extend(self._build_header(report))
        elements.extend(self._build_laboratory_info(report.laboratory))
        elements.extend(self._build_instrument_info(report.instrument))
        elements.extend(self._build_conditions(report.conditions))
        elements.extend(self._build_equipment(report.equipment))
        elements.extend(self._build_test_results(report.results))
        
        if report.compliance:
            elements.extend(self._build_compliance(report.compliance))
        
        if report.remarks:
            elements.extend(self._build_remarks(report.remarks))
        
        elements.extend(self._build_signatures(report))
        elements.extend(self._build_disclaimer())
        
        # Build PDF
        doc.build(elements, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
        
        return buffer.getvalue()
    
    def _add_header_footer(self, canvas, doc):
        """Add header and footer to each page."""
        canvas.saveState()
        
        # Header
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(ReportColors.TEXT_SECONDARY)
        
        # Left: Report number
        canvas.drawString(
            self.MARGIN,
            self.PAGE_HEIGHT - 1.5*cm,
            "Report: {}".format(doc.report.report_number if hasattr(doc, 'report') else "N/A")
        )
        
        # Right: Standard
        canvas.drawRightString(
            self.PAGE_WIDTH - self.MARGIN,
            self.PAGE_HEIGHT - 1.5*cm,
            "OIML R-76 ({})".format(doc.report.identification.standard_version if hasattr(doc, 'report') else "2009")
        )
        
        # Footer
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(ReportColors.TEXT_LIGHT)
        
        # Left: Generated date
        canvas.drawString(
            self.MARGIN,
            1*cm,
            "Generated: {}".format(datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
        )
        
        # Center: Page number
        canvas.drawCentredString(
            self.PAGE_WIDTH / 2,
            1*cm,
            "Page {} of {}".format(doc.page, doc.page)
        )
        
        # Right: Confidential
        canvas.drawRightString(
            self.PAGE_WIDTH - self.MARGIN,
            1*cm,
            "CONFIDENTIAL"
        )
        
        canvas.restoreState()
    
    def _build_header(self, report: TestReport) -> list:
        """Build report header section."""
        elements = []
        
        # Title
        elements.append(Paragraph(
            "TEST REPORT",
            self.styles['ReportTitle']
        ))
        
        # Report identification table
        id_data = [
            ['Report Number:', report.identification.report_number,
             'Date:', report.identification.report_date.strftime("%d %B %Y")],
            ['Standard:', report.identification.standard,
             'Version:', report.identification.standard_version],
            ['Revision:', report.identification.revision,
             '', ''],
        ]
        
        id_table = Table(id_data, colWidths=[3*cm, 5*cm, 2.5*cm, 5*cm])
        id_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), ReportColors.TEXT_SECONDARY),
            ('TEXTCOLOR', (2, 0), (2, -1), ReportColors.TEXT_SECONDARY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BACKGROUND', (0, 0), (-1, 0), ReportColors.SUBSECTION_BG),
        ]))
        
        elements.append(id_table)
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_laboratory_info(self, lab: LaboratoryInfo) -> list:
        """Build laboratory information section."""
        elements = []
        
        elements.append(Paragraph("1. LABORATORY INFORMATION", self.styles['SectionHeader']))
        
        data = [
            ['Laboratory Name', lab.name],
            ['Address', '{} {} {} {}'.format(lab.address, lab.city, lab.state, lab.country)],
            ['Phone', lab.phone],
            ['Email', lab.email],
            ['Accreditation Body', lab.accreditation_body],
            ['Accreditation Number', lab.accreditation_number],
            ['Accreditation Expiry', lab.accreditation_expiry.strftime("%d %B %Y") if lab.accreditation_expiry else 'N/A'],
        ]
        
        table = self._create_info_table(data)
        elements.append(table)
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_instrument_info(self, instrument: InstrumentInfo) -> list:
        """Build instrument information section."""
        elements = []
        
        elements.append(Paragraph("2. INSTRUMENT INFORMATION", self.styles['SectionHeader']))
        
        # Manufacturer
        elements.append(Paragraph("2.1 Manufacturer", self.styles['SubsectionHeader']))
        
        mfr_data = [
            ['Manufacturer', instrument.manufacturer.name],
            ['Country', instrument.manufacturer.country],
            ['Address', instrument.manufacturer.address],
        ]
        
        table = self._create_info_table(mfr_data)
        elements.append(table)
        elements.append(Spacer(1, 3*mm))
        
        # Instrument
        elements.append(Paragraph("2.2 Instrument", self.styles['SubsectionHeader']))
        
        inst_data = [
            ['Model Name', instrument.model_name],
            ['Model Number', instrument.model_number],
            ['Serial Number', instrument.serial_number],
            ['Instrument Type', instrument.instrument_type],
            ['Instrument Class', instrument.instrument_class],
            ['Maximum Capacity', '{} {}'.format(instrument.max_capacity, instrument.max_capacity_unit)],
            ['Minimum Capacity', '{} {}'.format(instrument.min_capacity, instrument.min_capacity_unit)],
            ['Scale Interval (d)', '{} {}'.format(instrument.scale_interval, instrument.scale_interval_unit)],
        ]
        
        if instrument.verification_scale_interval:
            inst_data.append(['Verification Scale Interval (e)', 
                            '{} {}'.format(instrument.verification_scale_interval, instrument.verification_scale_interval_unit)])
        
        if instrument.software_version:
            inst_data.append(['Software Version', instrument.software_version])
        
        if instrument.firmware_version:
            inst_data.append(['Firmware Version', instrument.firmware_version])
        
        table = self._create_info_table(inst_data)
        elements.append(table)
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_conditions(self, conditions: TestConditions) -> list:
        """Build test conditions section."""
        elements = []
        
        elements.append(Paragraph("3. TEST CONDITIONS", self.styles['SectionHeader']))
        
        # Environmental conditions table
        if conditions.conditions:
            header = ['Parameter', 'Value', 'Unit', 'Range', 'Status']
            data = [header]
            
            for cond in conditions.conditions:
                range_str = ''
                if cond.min_value is not None and cond.max_value is not None:
                    range_str = '{} - {}'.format(cond.min_value, cond.max_value)
                
                data.append([
                    cond.parameter,
                    str(cond.value),
                    cond.unit,
                    range_str,
                    cond.status.upper(),
                ])
            
            table = Table(data, colWidths=[3.5*cm, 2.5*cm, 2*cm, 3.5*cm, 2.5*cm])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 0), (-1, 0), ReportColors.TABLE_HEADER_BG),
                ('TEXTCOLOR', (0, 0), (-1, 0), ReportColors.WHITE),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, ReportColors.TABLE_BORDER),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [ReportColors.WHITE, ReportColors.TABLE_ALT_ROW]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            
            elements.append(table)
            elements.append(Spacer(1, 3*mm))
        
        # Test location and time
        loc_data = [
            ['Test Location', conditions.test_location],
            ['Location Detail', conditions.location_detail],
            ['Test Date', conditions.test_date.strftime("%d %B %Y") if conditions.test_date else 'N/A'],
            ['Start Time', conditions.start_time or 'N/A'],
            ['End Time', conditions.end_time or 'N/A'],
        ]
        
        table = self._create_info_table(loc_data)
        elements.append(table)
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_equipment(self, equipment: TestEquipment) -> list:
        """Build test equipment section."""
        elements = []
        
        elements.append(Paragraph("4. TEST EQUIPMENT", self.styles['SectionHeader']))
        
        if equipment.items:
            header = ['Equipment ID', 'Name', 'Type', 'Serial Number', 'Cal. Date', 'Cal. Valid Until']
            data = [header]
            
            for item in equipment.items:
                data.append([
                    item.equipment_id,
                    item.name,
                    item.equipment_type,
                    item.serial_number,
                    item.calibration_date.strftime("%d %b %Y") if item.calibration_date else 'N/A',
                    item.calibration_valid_until.strftime("%d %b %Y") if item.calibration_valid_until else 'N/A',
                ])
            
            table = Table(data, colWidths=[2.2*cm, 3*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.8*cm])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 7),
                ('BACKGROUND', (0, 0), (-1, 0), ReportColors.TABLE_HEADER_BG),
                ('TEXTCOLOR', (0, 0), (-1, 0), ReportColors.WHITE),
                ('GRID', (0, 0), (-1, -1), 0.5, ReportColors.TABLE_BORDER),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [ReportColors.WHITE, ReportColors.TABLE_ALT_ROW]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ]))
            
            elements.append(table)
        else:
            elements.append(Paragraph("No equipment records available.", self.styles['BodyText']))
        
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_test_results(self, results: list[TestResult]) -> list:
        """Build test results section."""
        elements = []
        
        elements.append(Paragraph("5. TEST PROCEDURES AND RESULTS", self.styles['SectionHeader']))
        
        for i, result in enumerate(results, 1):
            elements.extend(self._build_single_test_result(result, i))
        
        return elements
    
    def _build_single_test_result(self, result: TestResult, index: int) -> list:
        """Build a single test result subsection."""
        elements = []
        
        # Test header
        elements.append(Paragraph(
            "5.{} {} {}".format(index, result.procedure.test_code, result.procedure.test_name),
            self.styles['SubsectionHeader']
        ))
        
        if result.procedure.purpose:
            elements.append(Paragraph(
                "<b>Purpose:</b> {}".format(result.procedure.purpose),
                self.styles['BodyText']
            ))
        
        # Observations table
        if result.observations:
            elements.append(Paragraph("<b>5.{}.1 Observations</b>".format(index), self.styles['BodyText']))
            
            header = ['Obs. #', 'Value', 'Unit', 'Notes']
            data = [header]
            
            for obs in result.observations:
                data.append([
                    str(obs.observation_number),
                    str(obs.value),
                    obs.unit,
                    obs.notes or '',
                ])
            
            table = Table(data, colWidths=[2*cm, 3*cm, 2*cm, 8*cm])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 0), (-1, 0), ReportColors.TABLE_HEADER_BG),
                ('TEXTCOLOR', (0, 0), (-1, 0), ReportColors.WHITE),
                ('GRID', (0, 0), (-1, -1), 0.5, ReportColors.TABLE_BORDER),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [ReportColors.WHITE, ReportColors.TABLE_ALT_ROW]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ]))
            
            elements.append(table)
            elements.append(Spacer(1, 2*mm))
        
        # Results summary table (OBSERVED / CALCULATED / LIMIT / RESULT)
        elements.append(Paragraph("<b>5.{}.2 Results Summary</b>".format(index), self.styles['BodyText']))
        
        summary_header = ['Parameter', 'Observed', 'Calculated', 'Limit', 'Result']
        summary_data = [summary_header]
        
        # Add rows based on available data
        if result.mean is not None:
            summary_data.append([
                'Mean',
                '{:.6f}'.format(result.mean) if result.mean else '',
                '',
                '',
                '',
            ])
        
        if result.standard_deviation is not None:
            summary_data.append([
                'Standard Deviation',
                '{:.6f}'.format(result.standard_deviation),
                '{:.4f} d'.format(result.calculated_in_d) if result.calculated_in_d else '',
                '{} {}'.format(result.limit_value, result.limit_unit) if result.limit_value else '',
                result.status.upper() if result.status else '',
            ])
        
        if result.absolute_error is not None:
            summary_data.append([
                'Absolute Error',
                '{:.6f}'.format(result.absolute_error),
                '',
                '',
                '',
            ])
        
        if result.deviation_from_reference is not None:
            summary_data.append([
                'Deviation from Reference',
                '{:.6f}'.format(result.deviation_from_reference),
                '',
                '',
                '',
            ])
        
        if len(summary_data) > 1:  # More than just header
            table = Table(summary_data, colWidths=[4*cm, 3*cm, 3*cm, 3*cm, 3*cm])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 0), (-1, 0), ReportColors.TABLE_HEADER_BG),
                ('TEXTCOLOR', (0, 0), (-1, 0), ReportColors.WHITE),
                ('BACKGROUND', (1, 1), (1, -1), ReportColors.OBSERVED_BG),  # Observed column
                ('BACKGROUND', (2, 1), (2, -1), ReportColors.CALCULATED_BG),  # Calculated column
                ('BACKGROUND', (3, 1), (3, -1), ReportColors.LIMIT_BG),  # Limit column
                ('BACKGROUND', (4, 1), (4, -1), ReportColors.RESULT_BG),  # Result column
                ('GRID', (0, 0), (-1, -1), 0.5, ReportColors.TABLE_BORDER),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            
            elements.append(table)
        
        # Status
        if result.status:
            status_text = "Result: <b>{}</b>".format(result.status.upper())
            elements.append(Paragraph(status_text, self.styles['BodyText']))
        
        if result.reason:
            elements.append(Paragraph(
                "<i>{}</i>".format(result.reason),
                self.styles['SmallText']
            ))
        
        elements.append(Spacer(1, 3*mm))
        
        return elements
    
    def _build_compliance(self, compliance: ComplianceResult) -> list:
        """Build compliance section."""
        elements = []
        
        elements.append(Paragraph("6. COMPLIANCE RESULT", self.styles['SectionHeader']))
        
        # Overall status
        status_color = ReportColors.PASS_BG if compliance.overall_status == 'pass' else ReportColors.FAIL_BG
        
        status_data = [
            ['Overall Compliance Status', compliance.overall_status.upper()],
        ]
        
        table = Table(status_data, colWidths=[6*cm, 10*cm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (0, 0), ReportColors.SUBSECTION_BG),
            ('BACKGROUND', (1, 0), (1, 0), status_color),
            ('TEXTCOLOR', (1, 0), (1, 0), ReportColors.BLACK),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, ReportColors.TABLE_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 3*mm))
        
        # Individual test results summary
        if compliance.test_results:
            header = ['Test', 'Parameter', 'Calculated', 'Limit', 'Status']
            data = [header]
            
            for tr in compliance.test_results:
                data.append([
                    tr.procedure.test_name,
                    'Standard Deviation' if tr.standard_deviation else '',
                    '{:.4f} d'.format(tr.calculated_in_d) if tr.calculated_in_d else '',
                    '{} {}'.format(tr.limit_value, tr.limit_unit) if tr.limit_value else '',
                    tr.status.upper() if tr.status else '',
                ])
            
            table = Table(data, colWidths=[3*cm, 3*cm, 3*cm, 3*cm, 3*cm])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 0), (-1, 0), ReportColors.TABLE_HEADER_BG),
                ('TEXTCOLOR', (0, 0), (-1, 0), ReportColors.WHITE),
                ('GRID', (0, 0), (-1, -1), 0.5, ReportColors.TABLE_BORDER),
                ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            
            elements.append(table)
        
        if compliance.remarks:
            elements.append(Spacer(1, 3*mm))
            elements.append(Paragraph(
                "<b>Remarks:</b> {}".format(compliance.remarks),
                self.styles['BodyText']
            ))
        
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_remarks(self, remarks: str) -> list:
        """Build remarks section."""
        elements = []
        
        elements.append(Paragraph("7. REMARKS", self.styles['SectionHeader']))
        elements.append(Paragraph(remarks, self.styles['BodyText']))
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_signatures(self, report: TestReport) -> list:
        """Build signatures section."""
        elements = []
        
        elements.append(Paragraph("8. SIGNATURES", self.styles['SectionHeader']))
        
        sig_data = [['Role', 'Name', 'Title', 'Date']]
        
        if report.technician:
            sig_data.append([
                'Technician',
                report.technician.name,
                report.technician.title,
                report.technician.date.strftime("%d %B %Y") if report.technician.date else '',
            ])
        
        if report.reviewer:
            sig_data.append([
                'Reviewer',
                report.reviewer.name,
                report.reviewer.title,
                report.reviewer.date.strftime("%d %B %Y") if report.reviewer.date else '',
            ])
        
        if report.approver:
            sig_data.append([
                'Approver',
                report.approver.name,
                report.approver.title,
                report.approver.date.strftime("%d %B %Y") if report.approver.date else '',
            ])
        
        if len(sig_data) > 1:
            table = Table(sig_data, colWidths=[2.5*cm, 4*cm, 4*cm, 4*cm])
            table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), ReportColors.TABLE_HEADER_BG),
                ('TEXTCOLOR', (0, 0), (-1, 0), ReportColors.WHITE),
                ('GRID', (0, 0), (-1, -1), 0.5, ReportColors.TABLE_BORDER),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            elements.append(table)
        
        elements.append(Spacer(1, 4*mm))
        
        return elements
    
    def _build_disclaimer(self) -> list:
        """Build disclaimer section."""
        elements = []
        
        disclaimer_text = (
            "DISCLAIMER: This report is generated by software for informational purposes only. "
            "It does not constitute legal certification, regulatory approval, or official accreditation. "
            "Actual compliance determination must be made by authorized personnel in accordance with applicable regulations. "
            "The values presented are based on measurements and calculations performed using the described methodology."
        )
        
        elements.append(HRFlowable(width="100%", thickness=0.5, color=ReportColors.TABLE_BORDER))
        elements.append(Spacer(1, 2*mm))
        elements.append(Paragraph(disclaimer_text, self.styles['Disclaimer']))
        
        return elements
    
    def _create_info_table(self, data: list) -> Table:
        """Create a two-column info table."""
        table = Table(data, colWidths=[4*cm, 12*cm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), ReportColors.TEXT_SECONDARY),
            ('BACKGROUND', (0, 0), (0, -1), ReportColors.SUBSECTION_BG),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, ReportColors.TABLE_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        return table
