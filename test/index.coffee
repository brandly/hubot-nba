Helper = require 'hubot-test-helper'
helper = new Helper '../src'

Promise = require 'bluebird'
co = require 'co'
{ expect } = require 'chai'

username = 'brandly'

describe 'nba', ->
  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  context 'player info', ->
    command = '@hubot nba player steph'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield new Promise.delay(1000)

    it 'should reply with player stats', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]
      expect(reply).to.include 'Stephen Curry'
      expect(reply).to.include 'Warriors'
      expect(reply).to.include 'Guard'
      expect(reply).to.include 'Season averages'

  context 'team info', ->
    command = '@hubot nba team spurs'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield new Promise.delay(1000)

    it 'should reply with team stats', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]

      expect(reply).to.include 'San Antonio Spurs'
      expect(reply).to.include 'pts'
      expect(reply).to.include 'ast'
      expect(reply).to.include 'reb'

  context 'game scores', ->
    command = '@hubot nba scores'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield new Promise.delay(1000)

    it 'should reply with today\'s games', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]
      games = reply.split '\n\n'

      expect(games.length).to.be.greaterThan 0

  context 'standings', ->
    command = '@hubot nba standings'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield new Promise.delay(1000)

    it 'should reply with conference standings', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]

      expect(reply).to.include 'Eastern Conference'
      expect(reply).to.include 'Western Conference'
      expect(reply).to.include 'Pistons'
      expect(reply).to.include 'Celtics'
      expect(reply).to.include 'Warriors'
      expect(reply).to.include 'Spurs'
