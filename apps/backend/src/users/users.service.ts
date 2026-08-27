import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Model, QueryFilter } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { EncryptionService } from '../crypto/encryption.service';
import {
  MISSING_OPENROUTER_KEY_MESSAGE,
  resolveResumeSettings,
  type ResumeSettings,
} from '@resume-builder/shared';
import {
  OpenRouterService,
  type OpenRouterKeyUsage,
} from '../openrouter/openrouter.service';

const API_KEY_FIELDS = '+encryptedOpenrouterApiKey';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly encryptionService: EncryptionService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  private toPublicUser(user: UserDocument) {
    const {
      password: _password,
      encryptedOpenrouterApiKey,
      ...rest
    } = user.toObject();

    return {
      ...rest,
      resumeSettings: resolveResumeSettings(
        rest.resumeSettings as Partial<ResumeSettings> | undefined,
      ),
      hasOpenrouterApiKey: !!encryptedOpenrouterApiKey,
    };
  }

  private applyApiKeyUpdates(
    user: UserDocument,
    updateUserDto: UpdateUserDto,
  ): void {
    if (updateUserDto.clearOpenrouterApiKey) {
      user.encryptedOpenrouterApiKey = undefined;
    } else if (updateUserDto.openrouterApiKey !== undefined) {
      const trimmed = updateUserDto.openrouterApiKey.trim();
      user.encryptedOpenrouterApiKey = trimmed
        ? this.encryptionService.encrypt(trimmed)
        : undefined;
    }
  }

  async getResumeSettings(userId: string): Promise<ResumeSettings> {
    const user = await this.userModel
      .findById(userId)
      .select('resumeSettings')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return resolveResumeSettings(
      user.resumeSettings
        ? (JSON.parse(
            JSON.stringify(user.resumeSettings),
          ) as Partial<ResumeSettings>)
        : undefined,
    );
  }

  private applyUserProfileFields(
    user: UserDocument,
    updateUserDto: UpdateUserDto,
    options: {
      includeAdminFields?: boolean;
      includeEmail?: boolean;
      includePassword?: boolean;
    } = {},
  ): void {
    if (options.includeEmail && updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }
    if (options.includePassword && updateUserDto.password !== undefined) {
      user.password = updateUserDto.password;
    }
    if (options.includeAdminFields && updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.template !== undefined) {
      user.template = updateUserDto.template;
    }
    if (updateUserDto.instructions !== undefined) {
      user.instructions = updateUserDto.instructions;
    }
    if (updateUserDto.questionsPrompt !== undefined) {
      user.questionsPrompt = updateUserDto.questionsPrompt;
    }
    if (updateUserDto.coverLetterPrompt !== undefined) {
      user.coverLetterPrompt = updateUserDto.coverLetterPrompt;
    }
    if (updateUserDto.defaultAiModel !== undefined) {
      user.defaultAiModel = updateUserDto.defaultAiModel;
    }
    if (updateUserDto.defaultAiVersion !== undefined) {
      user.defaultAiVersion = updateUserDto.defaultAiVersion;
    }
    if (updateUserDto.defaultGenerateFromJson !== undefined) {
      user.defaultGenerateFromJson = updateUserDto.defaultGenerateFromJson;
    }
    if (updateUserDto.defaultFromJsonAiModel !== undefined) {
      user.defaultFromJsonAiModel = updateUserDto.defaultFromJsonAiModel;
    }
    if (updateUserDto.defaultFromJsonAiVersion !== undefined) {
      user.defaultFromJsonAiVersion = updateUserDto.defaultFromJsonAiVersion;
    }
  }

  private applyResumeSettingsUpdate(
    user: UserDocument,
    resumeSettings?: Partial<ResumeSettings>,
  ): void {
    if (resumeSettings === undefined) {
      return;
    }

    user.resumeSettings = resolveResumeSettings({
      ...(user.resumeSettings ? { ...user.resumeSettings } : {}),
      ...resumeSettings,
    } as Partial<ResumeSettings>) as UserDocument['resumeSettings'];
  }

  async getApiKeysForUser(userId: string): Promise<{
    openrouter: string | null;
  }> {
    const user = await this.userModel
      .findById(userId)
      .select(API_KEY_FIELDS)
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      openrouter: user.encryptedOpenrouterApiKey
        ? this.encryptionService.decrypt(user.encryptedOpenrouterApiKey)
        : null,
    };
  }

  async create(createUserDto: CreateUserDto) {
    const createdUser = new this.userModel(createUserDto);
    await createdUser.save();
    return this.toPublicUser(
      (await this.userModel
        .findById(createdUser._id)
        .select(API_KEY_FIELDS)
        .exec())!,
    );
  }

  async find(query: QueryFilter<User>) {
    return this.userModel.findOne(query).exec();
  }

  async findAll() {
    const users = await this.userModel.find().select(API_KEY_FIELDS).exec();
    return users.map((user) => this.toPublicUser(user));
  }

  async findById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select(API_KEY_FIELDS)
      .exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toPublicUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findById(id).select(API_KEY_FIELDS).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.applyUserProfileFields(user, updateUserDto, {
      includeAdminFields: true,
      includeEmail: true,
      includePassword: true,
    });
    this.applyResumeSettingsUpdate(user, updateUserDto.resumeSettings);
    this.applyApiKeyUpdates(user, updateUserDto);

    await user.save();

    return this.toPublicUser(
      (await this.userModel.findById(id).select(API_KEY_FIELDS).exec())!,
    );
  }

  async delete(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: `User with ID ${id} has been deleted` };
  }

  async updateProfile(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findById(id).select(API_KEY_FIELDS).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.newPassword) {
      if (!updateUserDto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change password',
        );
      }
      const isCurrentPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      user.password = updateUserDto.newPassword;
    }

    this.applyUserProfileFields(user, updateUserDto);
    this.applyResumeSettingsUpdate(user, updateUserDto.resumeSettings);
    this.applyApiKeyUpdates(user, updateUserDto);

    await user.save();

    return this.toPublicUser(
      (await this.userModel.findById(id).select(API_KEY_FIELDS).exec())!,
    );
  }

  async revealApiKeys(id: string, currentPassword: string) {
    const user = await this.userModel
      .findById(id)
      .select(`password ${API_KEY_FIELDS}`)
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (!currentPassword) {
      throw new BadRequestException('Current password is required');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    return {
      openrouterApiKey: user.encryptedOpenrouterApiKey
        ? this.encryptionService.decrypt(user.encryptedOpenrouterApiKey)
        : null,
    };
  }

  async getOpenrouterUsage(id: string): Promise<OpenRouterKeyUsage> {
    const keys = await this.getApiKeysForUser(id);

    if (!keys.openrouter?.trim()) {
      throw new BadRequestException(MISSING_OPENROUTER_KEY_MESSAGE);
    }

    return this.openRouterService.getKeyUsage({ openrouter: keys.openrouter });
  }
}
