// Web-Native ESC/POS Driver for Chromium browsers (Web Serial & WebUSB) with auto-fallback

export interface PrinterDeviceStatus {
  isSupported: boolean;
  type: 'serial' | 'usb' | 'system_dialog';
  connectedName?: string;
}

/**
 * Check if the current browser environment supports raw hardware printing
 */
export function checkThermalPrinterSupport(): PrinterDeviceStatus {
  if (typeof window === 'undefined') {
    return { isSupported: false, type: 'system_dialog' };
  }

  const hasSerial = 'serial' in navigator;
  const hasUsb = 'usb' in navigator;

  if (hasSerial) {
    return { isSupported: true, type: 'serial' };
  }
  if (hasUsb) {
    return { isSupported: true, type: 'usb' };
  }

  return { isSupported: false, type: 'system_dialog' };
}

/**
 * Send raw ESC/POS byte sequence directly to thermal printer
 */
export async function sendEscPosToPrinter(
  rawBytes: Uint8Array,
  options: { baudRate?: number } = { baudRate: 9600 }
): Promise<{ success: boolean; message: string; method: string }> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'SSR environment not supported', method: 'none' };
  }

  // 1. Try Web Serial API (Most reliable for TVS, Posiflex, Epson, Xprinter thermal printers)
  if ('serial' in navigator) {
    try {
      const serial = (navigator as any).serial;
      // Request port from user
      const port = await serial.requestPort();
      await port.open({ baudRate: options.baudRate || 9600 });

      const writer = port.writable.getWriter();
      await writer.write(rawBytes);
      writer.releaseLock();
      await port.close();

      return {
        success: true,
        message: 'Raw ESC/POS slip dispatched successfully to thermal printer.',
        method: 'WebSerial',
      };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // User cancelled picker, don't trigger error popup
        return { success: false, message: 'Printer selection cancelled.', method: 'WebSerial' };
      }
      console.warn('[WebSerial Print Warning]', err);
      // If WebSerial fails, fall back to window.print
    }
  }

  // 2. Try WebUSB API
  if ('usb' in navigator) {
    try {
      const usb = (navigator as any).usb;
      const device = await usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      // Find OUT endpoint
      const outEndpoint = device.configuration.interfaces[0].alternates[0].endpoints.find(
        (e: any) => e.direction === 'out'
      );
      if (outEndpoint) {
        await device.transferOut(outEndpoint.endpointNumber, rawBytes.buffer);
        await device.close();
        return {
          success: true,
          message: 'ESC/POS slip streamed via WebUSB.',
          method: 'WebUSB',
        };
      }
    } catch (usbErr: any) {
      if (usbErr.name !== 'NotFoundError') {
        console.warn('[WebUSB Print Warning]', usbErr);
      }
    }
  }

  // 3. Fallback: Standard browser window.print()
  window.print();
  return {
    success: true,
    message: 'System print dialog opened (Fallback).',
    method: 'BrowserDialog',
  };
}

/**
 * Sends a single kick pulse to open cash drawer or buzz kitchen alert
 */
export async function pulseDrawerOrBuzzer(): Promise<{ success: boolean; message: string }> {
  // ESC p 0 25 250 (pulse 50ms on pin 2)
  const buzzerBytes = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  const res = await sendEscPosToPrinter(buzzerBytes);
  return { success: res.success, message: res.message };
}
