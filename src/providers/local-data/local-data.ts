import { Injectable } from '@angular/core';
import { StorageProvider } from '@providers/storage/storage';
import { AuthProvider } from '@providers/auth/auth';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import { Contact, Profile, Wallet } from '@models/model';

import lodash from 'lodash';
import { v4 as uuid } from 'uuid';
import { Network } from 'ark-ts/model';

@Injectable()
export class LocalDataProvider {

  private STORAGE_PROFILES = 'profiles';
  private STORAGE_NETWORKS = 'networks';

  public profiles = {};
  public networks = {};

  constructor(public storage: StorageProvider, public authProvider: AuthProvider) {
    this.profilesLoad().subscribe((profiles) => this.profiles = profiles);
    this.networksLoad().subscribe((networks) => this.networks = networks);
  }

  contactAdd(profileId: string, contact: Contact) {
    this.profiles[profileId].contacts[this.generateUniqueId()] = contact;

    return this.profilesSave();
  }

  contactGet(profileId: string, contactId: string) {
    return this.profiles[profileId].contacts[contactId];
  }

  contactRemove(profileId: string, contactId: string) {
    delete this.profiles[profileId].contacts[contactId];

    return this.profilesSave();
  }

  networkActive() {
    let profile = this.profileActive();
    let network = new Network();

    Object.assign(network, this.networks[profile.networkId]);

    return network;
  }

  networkAdd(network: Network) {
    this.networks[this.generateUniqueId()] = network;

    return this.storage.set(this.STORAGE_NETWORKS, this.networks);
  }

  networkGet(networkId: string) {
    return this.networks[networkId];
  }

  networkRemove(networkId: string) {
    delete this.networks[networkId];

    return this.networks;
  }

  networksLoad() {
    const defaults = Network.getAll();

    return Observable.create((observer) => {
      this.storage.getObject(this.STORAGE_NETWORKS).subscribe((networks) => {
        if (!networks || lodash.isEmpty(networks)) {
          const uniqueDefaults = {};

          for (var i = 0; i < defaults.length; i++) {
            uniqueDefaults[this.generateUniqueId()] = defaults[i];
          }

          this.storage.set(this.STORAGE_NETWORKS, uniqueDefaults);
          observer.next(uniqueDefaults);
        } else {
          observer.next(networks);
        }

        observer.complete();
      });
    });
  }

  profileActive(): Profile {
    let activeId = this.authProvider.activeProfileId;

    if (activeId && this.profiles[activeId]) {
      return new Profile().deserialize(this.profiles[activeId]);
    }

    return null;
  }

  profileAdd(profile: Profile) {
    this.profiles[this.generateUniqueId()] = profile;

    return this.profilesSave();
  }

  profileGet(profileId: string) {
    return new Profile().deserialize(this.profiles[profileId]);
  }

  profileRemove(profileId: string) {
    delete this.profiles[profileId];

    return this.profilesSave();
  }

  profilesLoad() {
    return this.storage.getObject(this.STORAGE_PROFILES);
  }

  profilesSave(profiles = this.profiles) {
    return this.storage.set(this.STORAGE_PROFILES, profiles);
  }

  walletAdd(wallet: Wallet, profileId?: string) {
    if (!profileId) profileId = this.authProvider.activeProfileId;

    let profile = this.profileGet(profileId);

    if (!profile.wallets[wallet.address]) {
      return this.walletSave(wallet, profileId);
    }

    return this.profilesSave();
  }

  walletGet(address: string, profileId?: string): Wallet {
    if (!profileId) profileId = this.authProvider.activeProfileId;

    let profile = this.profileGet(profileId);
    let wallet = new Wallet();

    if (profile.wallets[address]) {
      wallet = wallet.deserialize(profile.wallets[address]);
      return wallet;
    }

    return null;
  }

  walletSave(wallet: Wallet, profileId?: string) {
    if (!profileId) profileId = this.authProvider.activeProfileId;

    let profile = this.profileGet(profileId);
    profile.wallets[wallet.address] = wallet;

    this.profiles[profileId] = profile;

    return this.profilesSave();
  }

  private generateUniqueId(): string {
    return uuid();
  }

}
