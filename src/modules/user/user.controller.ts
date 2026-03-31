import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Payload } from '../../common/interfaces';
import { LoggingService } from '../../core/logging';
import { LogAction } from '../../common/enums/logs.enum';
import { GetUser } from './decorators/get-user.decorator';
import { UserRole } from './enums/user-role.enum';
import { Roles } from './decorators/roles.decorator';
import { formatUserLog } from '../../common/helpers';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggingService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    this.logger.assign({
      action: LogAction.REGISTER,
      user: { email: registerDto.email },
      messages: [`Registration request received.`],
    });
    return this.userService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginUserDto) {
    this.logger.assign({
      action: LogAction.LOGIN,
      user: { email: loginDto.email },
      messages: [`Login request received.`],
    });
    return this.userService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@GetUser() user: Payload) {
    this.logger.assign({
      action: LogAction.GET_PROFILE,
      user: formatUserLog(user),
      messages: [`Fetch profile request received.`],
    });

    return this.userService.getProfile(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers(@GetUser() user: Payload) {
    this.logger.assign({
      action: LogAction.GET_ALL_USERS,
      user: formatUserLog(user),
      messages: [`Fetch all users request received.`],
    });
    return await this.userService.findAll();
  }
}
