package me.self.familytree.dao

import me.self.familytree.beans.Person
import org.neo4j.driver.Driver
import org.neo4j.ogm.drivers.bolt.driver.BoltDriver
import org.neo4j.ogm.session.SessionFactory
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FamilyTreeDao(
        @Inject val driver: Driver
) {
    private val session by lazy { SessionFactory(BoltDriver(driver), "me.self.familytree.beans").openSession()!! }
    private val depthOne = 1;
    private val depthTwo = 2;
    private val depthZero = 0;

    fun findPerson(personId: Long): Person? {
        return session.load(Person::class.java, personId, depthOne)
    }

    fun upsertPerson(person: Person): Person? {
        session.save(person, depthTwo)
        return person.id?.let { findPerson(it) }
    }

    fun updatePersonProperties(person: Person): Person? {
        session.save(person, depthZero)
        return person.id?.let { findPerson(it) }
    }
}
