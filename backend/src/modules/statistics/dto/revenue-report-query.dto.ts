import { ApiProperty } from '@nestjs/swagger';
import { IsIn, Matches } from 'class-validator';

export const REVENUE_REPORT_TYPES = ['SUMMARY', 'DETAIL'] as const;

export type RevenueReportType = (typeof REVENUE_REPORT_TYPES)[number];

export class RevenueReportQueryDto {
  @ApiProperty({ enum: REVENUE_REPORT_TYPES })
  @IsIn(REVENUE_REPORT_TYPES)
  type!: RevenueReportType;

  @ApiProperty({ example: '2026-08-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({ example: '2026-08-31' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
}
