import { NextRequest, NextResponse } from 'next/server';

/**
 * SMS Notification API for new orders
 * Sends WhatsApp/SMS alert to owner using MSG91 gateway
 * 
 * Environment variables required:
 * - MSG91_AUTH_KEY: Your MSG91 authentication key
 * - MSG91_FLOW_ID: Flow ID for your message template
 * - OWNER_PHONE: Owner's phone number (with country code, e.g., 919876543210)
 */

export async function POST(req: NextRequest) {
  try {
    const { orderId, amount, customerName, customerPhone } = await req.json();

    // Validate required fields
    if (!orderId || !amount || !customerName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if MSG91 is configured
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const msg91FlowId = process.env.MSG91_FLOW_ID;
    const ownerPhone = process.env.OWNER_PHONE;

    if (!msg91AuthKey || !msg91FlowId || !ownerPhone) {
      console.warn('MSG91 not fully configured, skipping SMS notification');
      return NextResponse.json({
        success: true,
        message: 'Notification skipped (MSG91 not configured)',
        note: 'Configure MSG91_AUTH_KEY, MSG91_FLOW_ID, and OWNER_PHONE to enable SMS alerts',
      });
    }

    // Format phone number (ensure country code)
    const formattedPhone = ownerPhone.startsWith('91') 
      ? ownerPhone 
      : '91' + ownerPhone.replace(/^0/, '');

    // Prepare MSG91 API payload
    const payload = {
      flow_id: msg91FlowId,
      sender: 'FRESH',
      recipients: [
        {
          mobiles: formattedPhone,
          orderId: orderId,
          amount: `₹${Math.round(amount)}`,
          customerName: customerName,
          customerPhone: customerPhone || 'N/A',
        },
      ],
    };

    // Send to MSG91
    const msg91Response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': msg91AuthKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const msg91Data = await msg91Response.json();

    if (!msg91Response.ok) {
      console.error('MSG91 API error:', msg91Data);
      return NextResponse.json(
        { success: false, error: 'Failed to send SMS notification' },
        { status: 500 }
      );
    }

    console.log('SMS notification sent successfully:', {
      orderId,
      recipient: formattedPhone,
      amount,
    });

    return NextResponse.json({
      success: true,
      message: 'SMS notification sent to owner',
      messageId: msg91Data.message_id || msg91Data.request_id,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
