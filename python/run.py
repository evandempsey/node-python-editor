#!/usr/bin/env python

import sys
import pika
import json
import StringIO
import contextlib


QUEUE_NAME = 'runpy'
QUEUE_HOST = 'localhost'


@contextlib.contextmanager
def stdio():
    stdout = StringIO.StringIO()
    sys.stdout = stdout
    yield stdout
    sys.stdout = sys.__stdout__


def start_listener():
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=QUEUE_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME,
                          durable=False,
                          auto_delete=True,
                          exclusive=False)

    channel.basic_consume(callback,
                          queue=QUEUE_NAME,
                          no_ack=True)

    channel.start_consuming()
    print "Python runner listening..."


def callback(ch, method, properties, body):
    data = json.loads(body)

    with stdio() as s:
        try:
            exec data["input"] in dict()
        except Exception, e:
            print e

    queue_output(s.getvalue(), data["correlation_id"])


def queue_output(output, correlation_id):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=QUEUE_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=correlation_id,
                          durable=False,
                          auto_delete=True,
                          exclusive=False)

    channel.basic_publish(
        exchange="",
        routing_key=correlation_id,
        body=json.dumps({"output": output}))
    connection.close()


start_listener()



