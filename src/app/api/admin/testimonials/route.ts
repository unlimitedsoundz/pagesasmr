export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    await db.syncTestimonialsFromSupabase().catch((e) => {
      console.warn('Sync testimonials warning in admin route:', e);
    });

    const allTestimonials = db.getTestimonials();

    const counts = {
      all: allTestimonials.length,
      pending: allTestimonials.filter((t) => t.status === 'PENDING').length,
      approved: allTestimonials.filter((t) => t.status === 'APPROVED').length,
      rejected: allTestimonials.filter((t) => t.status === 'REJECTED').length,
    };

    let testimonials = allTestimonials;
    if (status && status !== 'ALL') {
      testimonials = allTestimonials.filter((t) => t.status === status);
    }

    return NextResponse.json({
      success: true,
      testimonials,
      counts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch testimonials' },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Testimonial ID is required.' }, { status: 400 });
    }

    let updatedTestimonial;
    if (action === 'APPROVE') {
      updatedTestimonial = db.approveTestimonial(id, adminUser);
    } else if (action === 'REJECT') {
      updatedTestimonial = db.rejectTestimonial(id, adminUser);
    } else {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      testimonial: updatedTestimonial,
      message: action === 'APPROVE' ? 'Testimonial approved and published to public page!' : 'Testimonial rejected.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update testimonial status' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Testimonial ID is required.' }, { status: 400 });
    }

    const deleted = await db.deleteTestimonial(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Testimonial not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Testimonial deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}
