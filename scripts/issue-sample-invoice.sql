DO $$
DECLARE
  v_inv_num text;
  v_seq int;
BEGIN
  PERFORM set_config('app.tenant_id', 'a1fbcbf4-060c-434b-9257-f9ba225114db', true);
  PERFORM set_config('app.property_id', '256d93ff-5da4-465f-858d-8068b1ab90df', true);

  -- 1. Update folio item with 5% GST (declared tariff 3,200 <= 7,500)
  UPDATE folio_items
  SET tax_rate = 5.0,
      cgst_amount = 80.00,
      sgst_amount = 80.00,
      igst_amount = 0.00,
      line_total = 3360.00,
      hsn_sac = '996311',
      tax_category_code = 'ACCOMMODATION'
  WHERE id = '779c2969-f8e4-41ae-8c58-63350f2aef5a';

  -- 2. Update folio totals
  UPDATE reservation_folios
  SET subtotal = 3200.00, tax_total = 160.00, total = 3360.00
  WHERE id = 'e3e9ad43-e5b4-41a2-a250-eefcd6ffe508';

  -- 3. Obtain next invoice sequence for Grand Azure Hotel
  INSERT INTO property_invoice_sequences (tenant_id, property_id, gstin, financial_year, series_type, prefix, last_number)
  VALUES ('a1fbcbf4-060c-434b-9257-f9ba225114db', '256d93ff-5da4-465f-858d-8068b1ab90df', '27AAACG1234F1Z8', '26-27', 'TAX_INVOICE', 'GA', 0)
  ON CONFLICT (tenant_id, gstin, financial_year, series_type, prefix) DO NOTHING;

  SELECT last_number + 1 INTO v_seq
  FROM property_invoice_sequences
  WHERE tenant_id = 'a1fbcbf4-060c-434b-9257-f9ba225114db' AND gstin = '27AAACG1234F1Z8' AND financial_year = '26-27' AND series_type = 'TAX_INVOICE' AND prefix = 'GA'
  FOR UPDATE;

  UPDATE property_invoice_sequences
  SET last_number = v_seq, updated_at = now()
  WHERE tenant_id = 'a1fbcbf4-060c-434b-9257-f9ba225114db' AND gstin = '27AAACG1234F1Z8' AND financial_year = '26-27' AND series_type = 'TAX_INVOICE' AND prefix = 'GA';

  v_inv_num := 'GA/26-27/' || lpad(v_seq::text, 6, '0');

  -- 4. Issue tax invoice
  INSERT INTO tax_invoices (
    tenant_id, property_id, folio_id, reservation_id, invoice_number, financial_year, invoice_type,
    hotel_gstin, guest_gstin, guest_name, place_of_supply_state_code, is_interstate,
    total_taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total,
    irn_hash, signed_qr_code, irn_status
  )
  VALUES (
    'a1fbcbf4-060c-434b-9257-f9ba225114db', '256d93ff-5da4-465f-858d-8068b1ab90df',
    'e3e9ad43-e5b4-41a2-a250-eefcd6ffe508', '6b82799f-f0d8-441f-a99f-9aba73afb2a8',
    v_inv_num, '2026-2027', 'B2C',
    '27AAACG1234F1Z8', null, 'Asha Verma', '27', false,
    3200.00, 80.00, 80.00, 0.00, 3360.00,
    encode(sha256('sample-hash-irn'::bytea), 'hex'),
    'IRN:test|GSTIN:27AAACG1234F1Z8|INV:' || v_inv_num || '|VAL:3360.00',
    'generated'
  );

  UPDATE reservation_folios SET status = 'issued' WHERE id = 'e3e9ad43-e5b4-41a2-a250-eefcd6ffe508';
END $$;
