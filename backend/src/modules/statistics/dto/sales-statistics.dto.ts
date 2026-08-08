import { ApiProperty } from '@nestjs/swagger';

export class SalesStatisticsSummaryDto {
  @ApiProperty({ minimum: 0 }) paidRevenueVnd!: number;
  @ApiProperty({ minimum: 0 }) ticketsSold!: number;
  @ApiProperty({ minimum: 0 }) paidOrders!: number;
  @ApiProperty({ minimum: 0 }) publishedEvents!: number;
}

export class DailySalesStatisticDto {
  @ApiProperty({ example: '2026-08-08' }) date!: string;
  @ApiProperty({ minimum: 0 }) revenueVnd!: number;
  @ApiProperty({ minimum: 0 }) ticketsSold!: number;
}

export class TopEventStatisticDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ minimum: 0 }) revenueVnd!: number;
  @ApiProperty({ minimum: 0 }) ticketsSold!: number;
  @ApiProperty({ minimum: 0 }) paidOrders!: number;
}

export class SalesStatisticsDto {
  @ApiProperty({ type: SalesStatisticsSummaryDto })
  summary!: SalesStatisticsSummaryDto;

  @ApiProperty({ type: DailySalesStatisticDto, isArray: true })
  daily!: DailySalesStatisticDto[];

  @ApiProperty({ type: TopEventStatisticDto, isArray: true })
  topEvents!: TopEventStatisticDto[];
}
