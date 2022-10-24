Helper = require 'hubot-test-helper'
helper = new Helper '../src'

co = require 'co'
{ expect } = require 'chai'

username = 'brandly'
WAIT_FOR_MESSAGE = 2000

whenResponseArrives = (room) ->
  return new Promise((fulfill) ->
    intervalId = setInterval(() ->
      if room.messages.length > 1
        clearInterval intervalId
        fulfill()
    , 200)
  )

describe 'nba', ->
  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  context 'player', ->
    command = '@hubot nba player steph'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield whenResponseArrives(@room)

    it 'should reply with player stats', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]
      expect(reply).to.include 'Stephen Curry'
      expect(reply).to.include 'Warriors'
      expect(reply).to.include 'Guard'
      expect(reply).to.include 'Season averages'

  context 'team', ->
    command = '@hubot nba team spurs'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield whenResponseArrives(@room)

    it 'should reply with team stats', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]

      expect(reply).to.include 'San Antonio Spurs'
      expect(reply).to.include 'pts'
      expect(reply).to.include 'ast'
      expect(reply).to.include 'reb'

  context 'team roster', ->
    command = '@hubot nba roster bucks'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield whenResponseArrives(@room)

    it 'should reply with team roster', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]

      expect(reply).to.include 'Giannis Antetokounmpo'
      giannisBday = 'DEC 06, 1994'
      expect(reply).to.include giannisBday
      expect(reply).to.include 'Jrue Holiday'

  context 'team coaches', ->
    command = '@hubot nba coaches spurs'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield whenResponseArrives(@room)

    it 'should reply with team coaches', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]
      expect(reply).to.include 'Gregg Popovich'

  context 'game scores', ->
    command = '@hubot nba scores'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield whenResponseArrives(@room)

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
        yield whenResponseArrives(@room)

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

  context 'hustle', ->
    command = '@hubot nba hustle'
    beforeEach ->
      co =>
        yield @room.user.say username, command
        yield whenResponseArrives(@room)

    it 'should reply with best hustlers', ->
      expect(@room.messages[0]).to.eql [username, command]
      expect(@room.messages[1][0]).to.eql 'hubot'

      reply = @room.messages[1][1]

      expect(reply).to.include 'Contested Shots'
      expect(reply).to.include 'Charges Drawn'
      expect(reply).to.include 'Deflections'
      expect(reply).to.include 'Screen Assist'
