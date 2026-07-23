import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { StaffConnectDto } from './dto/staff-connect.dto';
import { CurrentUser } from './decorators/current-user.decorator';

import type { CurrentUserData } from './jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register an account' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'code: EMAIL_ALREADY_REGISTERED' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'code: INVALID_CREDENTIALS | ACCOUNT_BLOCKED',
  })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('staff-connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Redeem a one-time connect code for a scanner-device session',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'code: INVALID_CONNECT_CODE' })
  staffConnect(@Body() dto: StaffConnectDto): Promise<AuthResponseDto> {
    return this.auth.staffConnect(dto.code);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiOkResponse({ type: AuthResponseDto })
  me(@CurrentUser() user: CurrentUserData): AuthUserDto {
    return user;
  }
}
