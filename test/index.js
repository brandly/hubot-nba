const Helper = require('hubot-test-helper');
const helper = new Helper('../src');

const co = require('co');
const { expect } = require('chai');

const username = 'brandly';
const WAIT_FOR_MESSAGE = 2000;

const whenResponseArrives = (room) => {
  return new Promise((fulfill) => {
    const intervalId = setInterval(() => {
      if (room.messages.length > 1) {
        clearInterval(intervalId);
        fulfill();
      }
    }, 200);
  });
};

describe('nba', function () {
  beforeEach(function () {
    this.room = helper.createRoom();
  });

  afterEach(function () {
    this.room.destroy();
  });

  context('player', function () {
    const command = '@hubot nba player stephen';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should reply with player stats', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      expect(reply).to.include('Stephen Curry');
      expect(reply).to.include('Warriors');
      expect(reply).to.include('Guard');
      expect(reply).to.include('Season averages');
    });
  });

  context('team', function () {
    const command = '@hubot nba team spurs';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should reply with team stats', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      expect(reply).to.include('San Antonio Spurs');
      expect(reply).to.include('pts');
      expect(reply).to.include('ast');
      expect(reply).to.include('reb');
    });
  });

  context('team roster', function () {
    const command = '@hubot nba roster bucks';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should reply with team roster', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      expect(reply).to.include('Giannis Antetokounmpo');
      expect(reply).to.include('6\'11" 243 lbs');
      expect(reply).to.include('Damian Lillard');
    });
  });

  context('team coaches', function () {
    const command = '@hubot nba coaches spurs';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should reply with team coaches', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      expect(reply).to.include('Gregg Popovich');
    });
  });

  context('game scores', function () {
    const command = '@hubot nba scores';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should reply with today\'s games', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      const games = reply.split('\n\n');
      expect(games.length).to.be.greaterThan(0);
    });
  });

  context('standings', function () {
    const command = '@hubot nba standings';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should reply with conference standings', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      expect(reply).to.include('Eastern Conference');
      expect(reply).to.include('Western Conference');
      expect(reply).to.include('Pistons');
      expect(reply).to.include('Celtics');
      expect(reply).to.include('Warriors');
      expect(reply).to.include('Spurs');
    });
  });

  context('hustle', function () {
    const command = '@hubot nba hustle';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should reply with best hustlers', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      expect(reply).to.include('Contested Shots');
      expect(reply).to.include('Charges Drawn');
      expect(reply).to.include('Deflections');
      expect(reply).to.include('Screen Assist');
    });
  });

  context('case insensitivity', function () {
    const command = '@hubot NBA player lamelo';
    beforeEach(function () {
      return co(function* () {
        yield this.room.user.say(username, command);
        yield whenResponseArrives(this.room);
      }.bind(this));
    });

    it('should still reply with player stats', function () {
      expect(this.room.messages[0]).to.eql([username, command]);
      expect(this.room.messages[1][0]).to.eql('hubot');

      const reply = this.room.messages[1][1];
      expect(reply).to.include('LaMelo Ball');
      expect(reply).to.include('Hornets');
      expect(reply).to.include('Guard');
      expect(reply).to.include('Season averages');
    });
  });
});
